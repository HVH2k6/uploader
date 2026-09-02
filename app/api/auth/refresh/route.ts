import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signAccessToken, verifyRefreshToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'Không có refresh token' }, { status: 401 })
    }

    const payload = await verifyRefreshToken(refreshToken)

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      include: { role: true }
    })

    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json({ error: 'Refresh token không hợp lệ' }, { status: 401 })
    }

    const roleName = user.role?.name || 'User'
    // Generate new access token
    const newAccessToken = await signAccessToken({ 
      userId: user.id, 
      email: user.email, 
      role: roleName 
    })

    const response = NextResponse.json({ success: true })

    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 // 15m
    })

    return response

  } catch (error) {
    console.error('Refresh token error', error)
    return NextResponse.json({ error: 'Đã có lỗi xảy ra' }, { status: 500 })
  }
}
