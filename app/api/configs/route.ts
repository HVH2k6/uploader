import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/jwt'
import { z } from 'zod'

const lotusSchema = z.object({
  provider: z.literal('LOTUS'),
  accountName: z.string().min(1, 'Vui lòng nhập tên gợi nhớ tài khoản'),
  botToken: z.string().min(1, 'Vui lòng nhập Bot Token'),
  chatId: z.string().min(1, 'Vui lòng nhập Chat ID'),
  isActive: z.boolean().optional().default(true),
})

const tiktokSchema = z.object({
  provider: z.literal('TIKTOK'),
  accountName: z.string().min(1, 'Vui lòng nhập tên gợi nhớ tài khoản'),
  cookie: z.string().min(1, 'Vui lòng nhập Cookie'),
  csrfToken: z.string().optional().nullable(),
  referer: z.string().optional().default('https://ads.tiktok.com/'),
  isActive: z.boolean().optional().default(true),
})

const createConfigSchema = z.discriminatedUnion('provider', [lotusSchema, tiktokSchema])

// Helper to get authenticated user from request cookies
async function getAuthUser(req: NextRequest) {
  const token = req.cookies.get('accessToken')?.value
  if (!token) return null
  const payload = await verifyAccessToken(token)
  if (!payload || !payload.userId) return null
  return payload
}

// GET /api/configs - Lấy danh sách cấu hình
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')

    const whereClause: { userId: string; provider?: string } = {
      userId: auth.userId as string,
    }

    if (provider && (provider === 'LOTUS' || provider === 'TIKTOK')) {
      whereClause.provider = provider
    }

    const configs = await prisma.configUpload.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { histories: true }
        }
      }
    })

    return NextResponse.json({ configs })
  } catch (error) {
    console.error('Error fetching configs:', error)
    return NextResponse.json({ error: 'Lỗi khi tải danh sách cấu hình' }, { status: 500 })
  }
}

// POST /api/configs - Tạo mới cấu hình Lotus hoặc TikTok
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.provider === 'LOTUS') {
      const config = await prisma.configUpload.create({
        data: {
          userId: auth.userId as string,
          provider: 'LOTUS',
          accountName: data.accountName,
          botToken: data.botToken,
          chatId: data.chatId,
          isActive: data.isActive,
        },
      })
      return NextResponse.json({ success: true, config }, { status: 201 })
    } else {
      const config = await prisma.configUpload.create({
        data: {
          userId: auth.userId as string,
          provider: 'TIKTOK',
          accountName: data.accountName,
          cookie: data.cookie,
          csrfToken: data.csrfToken || null,
          referer: data.referer || 'https://ads.tiktok.com/',
          isActive: data.isActive,
        },
      })
      return NextResponse.json({ success: true, config }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating config:', error)
    return NextResponse.json({ error: 'Lỗi khi tạo cấu hình mới' }, { status: 500 })
  }
}
