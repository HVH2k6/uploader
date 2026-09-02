import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/jwt'
import { z } from 'zod'

const updateLotusSchema = z.object({
  provider: z.literal('LOTUS').optional(),
  accountName: z.string().min(1, 'Vui lòng nhập tên gợi nhớ tài khoản'),
  botToken: z.string().min(1, 'Vui lòng nhập Bot Token'),
  chatId: z.string().min(1, 'Vui lòng nhập Chat ID'),
  isActive: z.boolean().optional(),
})

const updateTiktokSchema = z.object({
  provider: z.literal('TIKTOK').optional(),
  accountName: z.string().min(1, 'Vui lòng nhập tên gợi nhớ tài khoản'),
  cookie: z.string().min(1, 'Vui lòng nhập Cookie'),
  csrfToken: z.string().optional().nullable(),
  referer: z.string().optional(),
  isActive: z.boolean().optional(),
})

async function getAuthUser(req: NextRequest) {
  const token = req.cookies.get('accessToken')?.value
  if (!token) return null
  const payload = await verifyAccessToken(token)
  if (!payload || !payload.userId) return null
  return payload
}

// GET /api/configs/[id] - Xem chi tiết 1 cấu hình
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const configId = parseInt(id, 10)

    if (isNaN(configId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    const config = await prisma.configUpload.findFirst({
      where: {
        id: configId,
        userId: auth.userId as string,
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình' }, { status: 404 })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json({ error: 'Đã có lỗi xảy ra' }, { status: 500 })
  }
}

// PUT /api/configs/[id] - Cập nhật cấu hình
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const configId = parseInt(id, 10)

    if (isNaN(configId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    const existing = await prisma.configUpload.findFirst({
      where: {
        id: configId,
        userId: auth.userId as string,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình' }, { status: 404 })
    }

    const body = await req.json()

    if (existing.provider === 'LOTUS') {
      const parsed = updateLotusSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
          { status: 400 }
        )
      }

      const updated = await prisma.configUpload.update({
        where: { id: configId },
        data: {
          accountName: parsed.data.accountName,
          botToken: parsed.data.botToken,
          chatId: parsed.data.chatId,
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      })

      return NextResponse.json({ success: true, config: updated })
    } else {
      const parsed = updateTiktokSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
          { status: 400 }
        )
      }

      const updated = await prisma.configUpload.update({
        where: { id: configId },
        data: {
          accountName: parsed.data.accountName,
          cookie: parsed.data.cookie,
          csrfToken: parsed.data.csrfToken || null,
          referer: parsed.data.referer || 'https://ads.tiktok.com/',
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      })

      return NextResponse.json({ success: true, config: updated })
    }
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json({ error: 'Lỗi khi cập nhật cấu hình' }, { status: 500 })
  }
}

// PATCH /api/configs/[id] - Đổi trạng thái isActive nhanh
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const configId = parseInt(id, 10)

    if (isNaN(configId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    const existing = await prisma.configUpload.findFirst({
      where: {
        id: configId,
        userId: auth.userId as string,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình' }, { status: 404 })
    }

    const body = await req.json()
    const updated = await prisma.configUpload.update({
      where: { id: configId },
      data: {
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : !existing.isActive,
      },
    })

    return NextResponse.json({ success: true, config: updated })
  } catch (error) {
    console.error('Error toggling config state:', error)
    return NextResponse.json({ error: 'Lỗi khi cập nhật trạng thái' }, { status: 500 })
  }
}

// DELETE /api/configs/[id] - Xóa cấu hình
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const configId = parseInt(id, 10)

    if (isNaN(configId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    const existing = await prisma.configUpload.findFirst({
      where: {
        id: configId,
        userId: auth.userId as string,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình' }, { status: 404 })
    }

    await prisma.configUpload.delete({
      where: { id: configId },
    })

    return NextResponse.json({ success: true, message: 'Đã xóa cấu hình thành công' })
  } catch (error) {
    console.error('Error deleting config:', error)
    return NextResponse.json({ error: 'Lỗi khi xóa cấu hình' }, { status: 500 })
  }
}
