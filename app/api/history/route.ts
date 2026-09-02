import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = payload.userId as string
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: any = { userId }
    if (provider && provider !== 'ALL') {
      where.providerUsed = provider
    }
    if (search) {
      where.originalFileName = { contains: search, mode: 'insensitive' }
    }

    const histories = await prisma.historyUpload.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        config: {
          select: {
            id: true,
            accountName: true,
            provider: true,
          },
        },
      },
    })

    const total = await prisma.historyUpload.count({ where })

    // Serialize BigInt fileSizeBytes to Number/String
    const formatted = histories.map((h) => ({
      ...h,
      fileSizeBytes: h.fileSizeBytes ? h.fileSizeBytes.toString() : null,
    }))

    return NextResponse.json({ histories: formatted, total })
  } catch (error: any) {
    console.error('History fetch error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi tải lịch sử' }, { status: 500 })
  }
}
