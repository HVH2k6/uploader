import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import { sliceVideoHLS, probeVideo } from '@/lib/ffmpeg'
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
    const { sessionId, inputFileName, encodeMode = 'auto', segmentDuration = 5 } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Thiếu sessionId' }, { status: 400 })
    }

    const sessionDir = path.join(TEMP_DIR, path.basename(sessionId))
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({ error: 'Thư mục phiên không tồn tại' }, { status: 404 })
    }

    const files = fs.readdirSync(sessionDir)
    const inputFile = inputFileName
      ? path.join(sessionDir, inputFileName)
      : path.join(sessionDir, files.find((f) => f.startsWith('input.')) || 'input.mp4')

    if (!fs.existsSync(inputFile)) {
      return NextResponse.json({ error: 'File video gốc không tồn tại trên server' }, { status: 400 })
    }

    const probe = await probeVideo(inputFile)

    const m3u8Path = path.join(sessionDir, 'playlist.m3u8')
    const segmentPattern = path.join(sessionDir, 'segment_%04d.ts')
    const progressFile = path.join(sessionDir, 'progress.txt')

    // Lưu metadata ban đầu
    fs.writeFileSync(
      path.join(sessionDir, 'meta.json'),
      JSON.stringify({
        duration: probe.duration,
        videoCodec: probe.videoCodec,
        audioCodec: probe.audioCodec,
        pixFmt: probe.pixFmt,
        needTranscode: probe.needTranscode,
        status: 'processing',
        createdAt: Date.now(),
      }),
      'utf-8'
    )

    // Khởi chạy tiến trình FFmpeg cắt HLS bất đồng bộ
    sliceVideoHLS({
      inputPath: inputFile,
      outputDir: sessionDir,
      m3u8Path,
      segmentPattern,
      progressFile,
      encodeMode,
      segmentDuration,
    })
      .then((res) => {
        const meta = {
          duration: res.duration,
          status: 'done',
          segmentsCount: res.segmentsCount,
          completedAt: Date.now(),
        }
        fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta), 'utf-8')
      })
      .catch((err) => {
        console.error('Slice HLS background error:', err)
        fs.writeFileSync(
          path.join(sessionDir, 'meta.json'),
          JSON.stringify({ status: 'error', error: err.message }),
          'utf-8'
        )
      })

    return NextResponse.json({
      ok: true,
      sessionId,
      duration: probe.duration,
      durationFormatted: probe.durationFormatted,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      needTranscode: probe.needTranscode,
      encodeModeUsed:
        encodeMode === 'safe' || (encodeMode === 'auto' && probe.needTranscode)
          ? 'Re-encode (Chuyển mã Web Safe H.264/AAC)'
          : 'Fast Remux (Giữ nguyên Stream H.264)',
    })
  } catch (error: any) {
    console.error('Slice error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi khởi chạy FFmpeg cắt video' }, { status: 500 })
  }
}
