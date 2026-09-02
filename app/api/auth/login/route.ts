import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác' }, { status: 400 })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không chính xác' }, { status: 400 })
    }

    const roleName = user.role?.name || 'User'
    const payload = { userId: user.id, email: user.email, role: roleName }
    const accessToken = await signAccessToken(payload)
    const refreshToken = await signRefreshToken(payload)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    })

    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, username: user.username, role: roleName } 
    })

    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 // 15m
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7d
    })

    return response

  } catch (error) {
    console.error('Login error', error)
    return NextResponse.json({ error: 'Đã có lỗi xảy ra' }, { status: 500 })
  }
}
