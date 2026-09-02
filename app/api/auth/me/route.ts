import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('accessToken')?.value

    if (!accessToken) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const payload = await verifyAccessToken(accessToken)

    if (!payload || !payload.userId) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        email: true,
        username: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          }
        },
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Me route error', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
