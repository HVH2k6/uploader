import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { uploadToLotus, uploadToTikTok } from '@/lib/uploader'
import fs from 'fs'
import path from 'path'

const TEMP_DIR = path.resolve(process.cwd(), '..', 'temp_hls_chunks')

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = payload.userId as string

    const body = await req.json()
    const { sessionId, segmentName, provider = 'LOTUS', cdnMode = 'traffic_fixed', specificConfigId } = body

    if (!sessionId || !segmentName) {
      return NextResponse.json({ error: 'Thiếu thông tin phân đoạn' }, { status: 400 })
    }

    const sessionDir = path.join(TEMP_DIR, path.basename(sessionId))
    const segmentPath = path.join(sessionDir, path.basename(segmentName))

    if (!fs.existsSync(segmentPath)) {
      return NextResponse.json({ error: `File phân đoạn ${segmentName} không tồn tại trên server` }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(segmentPath)
    const maxRetries = 4
    let lastError = ''

    // ----------------------------------------------------
    // 1. TIKTOK ADS UPLOAD (ÁP DỤNG RANDOM ACCOUNT SELECTION)
    // ----------------------------------------------------
    if (provider === 'TIKTOK') {
      const activeTikTokConfigs = await prisma.configUpload.findMany({
        where: {
          userId,
          provider: 'TIKTOK',
          isActive: true,
        },
      })

      if (activeTikTokConfigs.length === 0) {
        return NextResponse.json(
          { error: 'Chưa có tài khoản TikTok Ads nào đang kích hoạt trong CSDL. Vui lòng thêm cookie trong Cấu hình!' },
          { status: 400 }
        )
      }

      let assignedAccount = null
      if (specificConfigId) {
        assignedAccount = activeTikTokConfigs.find((c) => c.id === specificConfigId)
      }

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Random account selection giữa các tài khoản TikTok đang kích hoạt
        const account =
          attempt === 1 && assignedAccount
            ? assignedAccount
            : activeTikTokConfigs[Math.floor(Math.random() * activeTikTokConfigs.length)]

        const result = await uploadToTikTok(
          {
            cookie: account.cookie || '',
            csrfToken: account.csrfToken,
            referer: account.referer,
          },
          fileBuffer,
          segmentName
        )

        if (result.ok && result.url) {
          return NextResponse.json({
            ok: true,
            cdnUrl: result.url,
            provider: 'TIKTOK',
            accountUsed: account.accountName,
          })
        }

        lastError = result.error || 'Lỗi kết nối TikTok Ads API'
        if (attempt < maxRetries) {
          // Nghỉ ngẫu nhiên giữa các lần retry
          await new Promise((res) => setTimeout(res, 300 + Math.random() * 400))
        }
      }

      return NextResponse.json(
        { error: `Thất bại sau ${maxRetries} lần thử TikTok: ${lastError}` },
        { status: 500 }
      )
    }

    // ----------------------------------------------------
    // 2. LOTUS CDN UPLOAD (ROTATION BOT & CHAT ID)
    // ----------------------------------------------------
    const activeLotusConfigs = await prisma.configUpload.findMany({
      where: {
        userId,
        provider: 'LOTUS',
        isActive: true,
      },
    })

    if (activeLotusConfigs.length === 0) {
      return NextResponse.json(
        { error: 'Chưa có cấu hình Lotus Bot nào đang kích hoạt trong CSDL. Vui lòng thêm trong Cấu hình!' },
        { status: 400 }
      )
    }

    let assignedBot = null
    if (specificConfigId) {
      assignedBot = activeLotusConfigs.find((c) => c.id === specificConfigId)
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Rotation / Random Bot selection
      const bot =
        attempt === 1 && assignedBot
          ? assignedBot
          : activeLotusConfigs[Math.floor(Math.random() * activeLotusConfigs.length)]

      const botToken = bot.botToken || ''
      const chatId = bot.chatId || '15691382'

      const result = await uploadToLotus(botToken, chatId, fileBuffer, segmentName, cdnMode)

      if (result.ok && result.url) {
        return NextResponse.json({
          ok: true,
          cdnUrl: result.url,
          provider: 'LOTUS',
          accountUsed: bot.accountName,
        })
      }

      lastError = result.error || 'Lỗi kết nối Lotus API'
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 250 + Math.random() * 350))
      }
    }

    return NextResponse.json(
      { error: `Thất bại sau ${maxRetries} lần thử Lotus: ${lastError}` },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Upload segment error:', error)
    return NextResponse.json({ error: error.message || 'Lỗi upload phân đoạn' }, { status: 500 })
  }
}
