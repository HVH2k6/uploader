import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import fs from 'fs'
import path from 'path'

// Thư mục lưu trữ tạm các phân đoạn HLS
const TEMP_DIR = path.resolve(process.cwd(), '..', 'temp_hls_chunks')

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true })
    }

    const sessionId = `session_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
    const sessionDir = path.join(TEMP_DIR, sessionId)
    fs.mkdirSync(sessionDir, { recursive: true })

    return NextResponse.json({ ok: true, sessionId })
  } catch (error: any) {
    console.error('Init session error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi khởi tạo phiên upload' }, { status: 500 })
  }
}
