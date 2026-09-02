import fs from 'fs'
import path from 'path'

// 188-Byte PNG Header để đánh lừa kiểm duyệt của TikTok Ads API
const DEFAULT_PNG_HEADER = Buffer.from(
  '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A\x00\x00\x00\x0D\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1F\x15\xC4\x89\x00\x00\x00\x0A\x49\x44\x41\x54\x78\x9C\x63\x00\x01\x00\x00\x05\x00\x01\x0D\x0A\x2D\xB4\x00\x00\x00\x00\x49\x45\x4E\x44\xAE\x42\x60\x82',
  'binary'
)

const MAGIC_HEADER_188 = Buffer.alloc(188, 0)
DEFAULT_PNG_HEADER.copy(MAGIC_HEADER_188, 0, 0, Math.min(DEFAULT_PNG_HEADER.length, 188))

export interface LotusUploadResult {
  ok: boolean
  url?: string
  error?: string
}

export interface TiktokUploadResult {
  ok: boolean
  url?: string
  error?: string
}

export interface TikTokAccountConfig {
  id?: number
  name?: string
  cookie: string
  csrfToken?: string | null
  referer?: string | null
}

// Upload segment lên Lotus Chat CDN
export async function uploadToLotus(
  botToken: string,
  chatId: string,
  fileBuffer: Buffer,
  fileName: string,
  cdnMode: 'traffic_fixed' | 'direct' | 'traffic_raw' = 'traffic_fixed'
): Promise<LotusUploadResult> {
  const lotusOriginalBase = 'https://chat-cdn.lotus.vn/'
  const lotusTrafficBase = 'https://cdn-traffic-chat.lotus.vn/ibFzeAsvnNaDaCbL/'

  const methods = [
    { endpoint: 'sendDocument', field: 'document', mime: 'application/octet-stream' },
    { endpoint: 'sendVideo', field: 'video', mime: 'video/mp2t' },
    { endpoint: 'sendDocument', field: 'file', mime: 'application/octet-stream' },
    { endpoint: 'sendFile', field: 'file', mime: 'application/octet-stream' },
  ]

  let lastError = ''

  for (const method of methods) {
    try {
      const url = `http://bot.lotuschat.vn/bot${botToken}/${method.endpoint}`
      const formData = new FormData()
      formData.append('chat_id', chatId)
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: method.mime })
      formData.append(method.field, blob, fileName)

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(45000),
      })

      if (response.status === 429) {
        return { ok: false, error: 'Lotus API HTTP 429: Bị giới hạn tần suất gửi' }
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${response.statusText}`
        continue
      }

      const data = await response.json()
      if (!data || !data.ok || !data.result) {
        lastError = data?.description || 'Không nhận được kết quả từ Lotus'
        continue
      }

      const result = data.result
      let mediaInfo = null
      for (const key of ['video', 'document', 'audio', 'file']) {
        if (result[key] && typeof result[key] === 'object') {
          mediaInfo = result[key]
          break
        }
      }

      const rawCdnLink = mediaInfo?.link_cdn || result.link_cdn || result.url
      if (!rawCdnLink) {
        lastError = 'Không tìm thấy link_cdn trong kết quả Lotus'
        continue
      }

      const rawLinkWithoutQuery = String(rawCdnLink).split('?')[0]
      const urlObj = new URL(rawLinkWithoutQuery.startsWith('http') ? rawLinkWithoutQuery : `https://chat-cdn.lotus.vn/${rawLinkWithoutQuery}`)
      const cleanPath = urlObj.pathname.replace(/^\/+/, '')

      let cdnUrl = ''
      if (cdnMode === 'direct') {
        cdnUrl = lotusOriginalBase + cleanPath
      } else if (cdnMode === 'traffic_raw') {
        cdnUrl = lotusTrafficBase + cleanPath
      } else {
        const cleanRel = cleanPath.replace(/^lotuschat-prod\//i, '')
        cdnUrl = lotusTrafficBase + cleanRel
      }

      return { ok: true, url: cdnUrl }
    } catch (err: any) {
      lastError = err.message || 'Lỗi mạng'
    }
  }

  return { ok: false, error: `Lotus upload thất bại: ${lastError}` }
}

// Upload segment lên TikTok Ads CDN (Disguised PNG)
export async function uploadToTikTok(
  account: TikTokAccountConfig,
  fileBuffer: Buffer,
  fileName: string
): Promise<TiktokUploadResult> {
  try {
    // 1. Gộp Magic PNG Header + Raw TS Bytes
    const disguisedBytes = Buffer.concat([MAGIC_HEADER_188, fileBuffer])
    const pngFileName = `${fileName.replace(/\.[^/.]+$/, '')}.png`

    // 2. Parse Cookie & CSRF Token
    let cookieStr = account.cookie.trim()
    if (cookieStr.startsWith('[') || cookieStr.startsWith('{')) {
      try {
        const parsed = JSON.parse(cookieStr)
        const cookiesArr = Array.isArray(parsed) ? parsed : parsed.cookies || []
        const pairs: string[] = []
        for (const item of cookiesArr) {
          if (item && item.name && item.value) {
            pairs.push(`${item.name}=${item.value}`)
          }
        }
        if (pairs.length > 0) {
          cookieStr = pairs.join('; ')
        }
      } catch (e) {}
    }

    let csrfToken = account.csrfToken?.trim() || ''
    if (!csrfToken) {
      const match = cookieStr.match(/csrftoken=([^;]+)/)
      if (match) csrfToken = match[1].trim()
    }
    if (!csrfToken) csrfToken = cookieStr

    if (csrfToken && !cookieStr.includes('csrftoken=')) {
      cookieStr = `csrftoken=${csrfToken}; ${cookieStr}`
    }

    // 3. Chuẩn bị FormData & Gửi request
    const formData = new FormData()
    formData.append('name', pngFileName)
    const blob = new Blob([new Uint8Array(disguisedBytes)], { type: 'image/png' })
    formData.append('file', blob, pngFileName)

    const response = await fetch('https://ads.tiktok.com/instant_page/api/v1/file/upload/', {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Origin: 'https://ads.tiktok.com',
        Referer: account.referer || 'https://ads.tiktok.com/',
        'x-csrftoken': csrfToken,
        Cookie: cookieStr,
      },
      signal: AbortSignal.timeout(45000),
    })

    if (response.status === 429) {
      return { ok: false, error: 'TikTok HTTP 429: Bị giới hạn tần suất' }
    }

    if (!response.ok) {
      return { ok: false, error: `TikTok HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()
    if (!data || data.code !== 0 || !data.data) {
      const msg = data?.msg || data?.message || 'TikTok Ads từ chối tải lên'
      return { ok: false, error: `TikTok: ${msg}` }
    }

    // Trích xuất ByteDance CDN URL
    let cdnUrl = ''
    if (data.data.src) {
      const srcUrl = data.data.src
      const lastPart = srcUrl.split('/').pop() || srcUrl
      const idImage = lastPart.split('~')[0]
      cdnUrl = `https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/${idImage}`
    } else if (data.data.uri) {
      const uriStr = data.data.uri.replace('ad-site-i18n-sg/', '')
      cdnUrl = `https://p16-tiktokcdn-com.akamaized.net/origin/ad-site-i18n/${uriStr}`
    } else if (data.data.original_img_uri) {
      cdnUrl = `https://p16-tiktok-ads-sg.tiktokcdn.com/obj/${data.data.original_img_uri}`
    }

    if (cdnUrl) {
      return { ok: true, url: cdnUrl }
    }

    return { ok: false, error: 'Không tìm thấy link ảnh trong phản hồi TikTok' }
  } catch (err: any) {
    return { ok: false, error: `Lỗi TikTok upload: ${err.message}` }
  }
}
