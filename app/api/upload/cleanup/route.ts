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

    const body = await req.json()
    const { sessionId } = body

    if (sessionId) {
      const sessionDir = path.join(TEMP_DIR, path.basename(sessionId))
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true })
      }
    }

    return NextResponse.json({ ok: true, message: 'Đã dọn dẹp thư mục tạm' })
  } catch (error: any) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi dọn dẹp' }, { status: 500 })
  }
}
