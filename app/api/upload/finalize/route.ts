import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const TEMP_DIR = path.resolve(process.cwd(), '..', 'temp_hls_chunks')
const PUBLIC_M3U8_DIR = path.resolve(process.cwd(), 'public', 'm3u8')

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = payload.userId as string

    const body = await req.json()
    const {
      sessionId,
      originalFileName,
      fileSizeBytes,
      durationSeconds,
      providerUsed,
      configId,
      segmentsMapping, // Record<string, string> mapping filename to cdnUrl
      m3u8Template,
    } = body

    if (!sessionId || !segmentsMapping) {
      return NextResponse.json({ error: 'Thiếu dữ liệu hoàn tất' }, { status: 400 })
    }

    // 1. Tạo nội dung M3U8 hoàn chỉnh
    let finalM3U8 = m3u8Template || ''

    if (!finalM3U8) {
      const sessionDir = path.join(TEMP_DIR, path.basename(sessionId))
      const m3u8Path = path.join(sessionDir, 'playlist.m3u8')
      if (fs.existsSync(m3u8Path)) {
        finalM3U8 = fs.readFileSync(m3u8Path, 'utf-8')
      }
    }

    // Thay thế từng file phân đoạn .ts bằng link CDN tương ứng
    for (const [segName, cdnUrl] of Object.entries(segmentsMapping)) {
      if (cdnUrl && typeof cdnUrl === 'string') {
        finalM3U8 = finalM3U8.replaceAll(segName, cdnUrl)
      }
    }

    // Đảm bảo có header #EXTM3U
    if (!finalM3U8.startsWith('#EXTM3U')) {
      finalM3U8 = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n#EXT-X-PLAYLIST-TYPE:VOD\n` + finalM3U8
    }

    // 2. Tạo bản ghi lịch sử trong Database
    const history = await prisma.historyUpload.create({
      data: {
        userId,
        configId: configId ? parseInt(configId, 10) : null,
        originalFileName: originalFileName || 'video.mp4',
        fileSizeBytes: fileSizeBytes ? BigInt(fileSizeBytes) : null,
        durationSeconds: durationSeconds ? parseFloat(durationSeconds) : null,
        providerUsed: providerUsed || 'LOTUS',
        status: 'COMPLETED',
        m3u8Url: `/api/m3u8/temp`, // Sẽ cập nhật ngay bên dưới với ID
      },
    })

    // 3. Lưu file .m3u8 vào public/m3u8/<history.id>.m3u8
    if (!fs.existsSync(PUBLIC_M3U8_DIR)) {
      fs.mkdirSync(PUBLIC_M3U8_DIR, { recursive: true })
    }

    const m3u8FilePath = path.join(PUBLIC_M3U8_DIR, `${history.id}.m3u8`)
    fs.writeFileSync(m3u8FilePath, finalM3U8, 'utf-8')

    // Cập nhật lại m3u8Url chuẩn
    const publicM3u8Url = `/api/m3u8/${history.id}`
    await prisma.historyUpload.update({
      where: { id: history.id },
      data: { m3u8Url: publicM3u8Url },
    })

    // 4. DỌN DẸP SẠCH SẼ THƯ MỤC TẠM (TEMP_HLS_CHUNKS)
    const sessionDir = path.join(TEMP_DIR, path.basename(sessionId))
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true })
        console.log(`🧹 Đã dọn dẹp sạch sẽ thư mục tạm: ${sessionDir}`)
      } catch (cleanErr) {
        console.error('Lỗi khi xóa thư mục tạm:', cleanErr)
      }
    }

    return NextResponse.json({
      ok: true,
      historyId: history.id,
      m3u8Url: publicM3u8Url,
      m3u8Content: finalM3U8,
      message: 'Upload video và tạo playlist HLS hoàn tất!',
    })
  } catch (error: any) {
    console.error('Finalize upload error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi hoàn tất upload' }, { status: 500 })
  }
}
