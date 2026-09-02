import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import { formatSecondsToTime } from '@/lib/ffmpeg'
import fs from 'fs'
import path from 'path'

const TEMP_DIR = path.resolve(process.cwd(), '..', 'temp_hls_chunks')

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Thiếu sessionId' }, { status: 400 })
    }

    const sessionDir = path.join(TEMP_DIR, path.basename(sessionId))
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({ error: 'Thư mục phiên không tồn tại hoặc đã hết hạn' }, { status: 404 })
    }

    const metaFile = path.join(sessionDir, 'meta.json')
    let meta: any = {}
    if (fs.existsSync(metaFile)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
      } catch (e) {}
    }

    if (meta.status === 'error') {
      return NextResponse.json({ ok: false, error: meta.error || 'Lỗi xử lý FFmpeg' }, { status: 500 })
    }

    const duration = parseFloat(meta.duration || 0)
    const files = fs.readdirSync(sessionDir)
    const tsFiles = files.filter((f) => f.endsWith('.ts')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    const chunksCreated = tsFiles.length

    let progressPercent = 0
    let outTimeStr = '00:00:00'
    let speedStr = '1.0x'
    let isDone = false

    const progressFile = path.join(sessionDir, 'progress.txt')
    const m3u8Path = path.join(sessionDir, 'playlist.m3u8')

    if (fs.existsSync(progressFile)) {
      const progContent = fs.readFileSync(progressFile, 'utf-8')
      const lines = progContent.split('\n')
      for (const line of lines) {
        if (line.startsWith('out_time=')) {
          outTimeStr = line.split('=')[1]?.split('.')[0] || '00:00:00'
        }
        if (line.startsWith('speed=')) {
          speedStr = line.split('=')[1] || '1.0x'
        }
        if (line.startsWith('percent=')) {
          progressPercent = parseInt(line.split('=')[1], 10) || 0
        }
        if (line.includes('progress=end')) {
          isDone = true
        }
      }
    }

    if (meta.status === 'done' || isDone || (fs.existsSync(m3u8Path) && progressPercent >= 99)) {
      isDone = true
      progressPercent = 100

      const segmentsData = tsFiles.map((ts) => {
        const stats = fs.statSync(path.join(sessionDir, ts))
        return {
          name: ts,
          size: stats.size,
        }
      })

      const m3u8Content = fs.existsSync(m3u8Path) ? fs.readFileSync(m3u8Path, 'utf-8') : ''

      return NextResponse.json({
        ok: true,
        isDone: true,
        progressPercent: 100,
        chunksCreated: segmentsData.length,
        outTime: formatSecondsToTime(duration),
        totalTime: formatSecondsToTime(duration),
        speed: speedStr,
        segments: segmentsData,
        m3u8Content,
      })
    }

    return NextResponse.json({
      ok: true,
      isDone: false,
      progressPercent,
      chunksCreated,
      outTime: outTimeStr,
      totalTime: formatSecondsToTime(duration),
      speed: speedStr,
    })
  } catch (error: any) {
    console.error('Slice progress error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi kiểm tra tiến trình' }, { status: 500 })
  }
}
