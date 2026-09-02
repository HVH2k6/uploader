import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const PUBLIC_M3U8_DIR = path.resolve(process.cwd(), 'public', 'm3u8')

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const isDownload = searchParams.get('download') === '1'

    const m3u8FilePath = path.join(PUBLIC_M3U8_DIR, `${path.basename(id)}.m3u8`)

    let content = ''
    if (fs.existsSync(m3u8FilePath)) {
      content = fs.readFileSync(m3u8FilePath, 'utf-8')
    } else {
      // Tìm trong DB
      const history = await prisma.historyUpload.findUnique({
        where: { id },
      })
      if (!history) {
        return new NextResponse('#EXTM3U\n#EXT-X-ERROR: Playlist Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'public, max-age=3600',
    }

    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="${id}.m3u8"`
    }

    return new NextResponse(content, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error('M3U8 fetch error:', error)
    return new NextResponse('#EXTM3U\n#EXT-X-ERROR: Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
