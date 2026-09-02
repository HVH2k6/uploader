import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/jwt'
import fs from 'fs'
import path from 'path'

const PUBLIC_M3U8_DIR = path.resolve(process.cwd(), 'public', 'm3u8')

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const userId = payload.userId as string

    const history = await prisma.historyUpload.findFirst({
      where: { id, userId },
    })

    if (!history) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi lịch sử' }, { status: 404 })
    }

    await prisma.historyUpload.delete({
      where: { id },
    })

    // Xóa file .m3u8 tương ứng nếu có
    const m3u8File = path.join(PUBLIC_M3U8_DIR, `${id}.m3u8`)
    if (fs.existsSync(m3u8File)) {
      try {
        fs.unlinkSync(m3u8File)
      } catch (e) {}
    }

    return NextResponse.json({ ok: true, message: 'Đã xóa bản ghi lịch sử thành công' })
  } catch (error: any) {
    console.error('History delete error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa lịch sử' }, { status: 500 })
  }
}
