import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
  username: z.string().min(2, 'Username phải ít nhất 2 ký tự').optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' }, { status: 400 })
    }

    const { email, password, username } = parsed.data

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const roleId = await prisma.role.findUnique({
      where: { name: 'User' },
      select: { id: true }
    })
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        roleId: roleId?.id
      }
    })

    const roleName = 'User'
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

    // HTTP-Only Cookies
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
    console.error('Register error', error)
    return NextResponse.json({ error: 'Đã có lỗi xảy ra' }, { status: 500 })
  }
}
