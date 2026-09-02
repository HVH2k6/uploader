import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import fs from 'fs'
import path from 'path'

const TEMP_DIR = path.resolve(process.cwd(), '..', 'temp_hls_chunks')

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Đọc thông tin qua Headers (tương thích 100% Unicode tiếng Việt và tránh lỗi parse multipart)
    let sessionId = req.headers.get('x-session-id')
    let chunkIndex = parseInt(req.headers.get('x-chunk-index') || '', 10)
    let totalChunks = parseInt(req.headers.get('x-total-chunks') || '', 10)
    let rawFileName = req.headers.get('x-file-name')
    let fileName = 'video.mp4'

    if (rawFileName) {
      try {
        fileName = decodeURIComponent(rawFileName)
      } catch (e) {
        fileName = rawFileName
      }
    }

    let buffer: Buffer

    // Kiểm tra xem dữ liệu được gửi qua Raw Binary hay FormData
    if (sessionId && !isNaN(chunkIndex)) {
      // Nhận trực tiếp ArrayBuffer (Nhanh & ổn định nhất cho file dung lượng lớn)
      const arrayBuffer = await req.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      // Fallback nếu client gửi qua FormData
      const formData = await req.formData()
      sessionId = formData.get('sessionId') as string
      chunkIndex = parseInt(formData.get('chunkIndex') as string, 10)
      totalChunks = parseInt(formData.get('totalChunks') as string, 10)
      fileName = (formData.get('fileName') as string) || fileName
      const chunkFile = formData.get('chunk') as File

      if (!chunkFile) {
        return NextResponse.json({ error: 'Không tìm thấy dữ liệu phân đoạn video' }, { status: 400 })
      }
      buffer = Buffer.from(await chunkFile.arrayBuffer())
    }

    if (!sessionId || isNaN(chunkIndex) || !buffer) {
      return NextResponse.json({ error: 'Thiếu thông tin phân đoạn chunk' }, { status: 400 })
    }

    const sessionDir = path.join(TEMP_DIR, path.basename(sessionId))
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({ error: 'Phiên upload không tồn tại hoặc đã hết hạn' }, { status: 404 })
    }

    const ext = path.extname(fileName || 'video.mp4') || '.mp4'
    const inputFilePath = path.join(sessionDir, `input${ext}`)

    // Nếu chunk đầu tiên, ghi mới; các chunk tiếp theo thì append
    if (chunkIndex === 0) {
      fs.writeFileSync(inputFilePath, buffer)
    } else {
      fs.appendFileSync(inputFilePath, buffer)
    }

    return NextResponse.json({
      ok: true,
      chunkIndex,
      totalChunks,
      isComplete: chunkIndex === totalChunks - 1,
      inputFileName: `input${ext}`,
    })
  } catch (error: any) {
    if (error?.code === 'ECONNRESET' || error?.message?.toLowerCase().includes('aborted')) {
      return NextResponse.json({ error: 'Request was cancelled by client' }, { status: 499 })
    }
    console.error('Upload chunk error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi nhận phân đoạn video' }, { status: 500 })
  }
}
