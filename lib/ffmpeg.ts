import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'

// Hàm tìm kiếm và cấu hình đường dẫn FFmpeg & FFprobe tự động trên Windows và VPS Linux
function resolveBinary(type: 'ffmpeg' | 'ffprobe'): string | undefined {
  // 1. Ưu tiên biến môi trường cấu hình trong .env (FFMPEG_PATH, FFPROBE_PATH)
  const envPath = type === 'ffmpeg' ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH
  if (envPath && fs.existsSync(envPath)) {
    return envPath
  }

  // 2. Tìm theo các đường dẫn mặc định phổ biến của từng hệ điều hành
  const isWindows = process.platform === 'win32'
  const candidatePaths = isWindows
    ? [
        `D:\\ffmpeg\\bin\\${type}.exe`,
        `C:\\ffmpeg\\bin\\${type}.exe`,
        `C:\\Program Files\\ffmpeg\\bin\\${type}.exe`,
        `C:\\ProgramData\\chocolatey\\bin\\${type}.exe`,
      ]
    : [
        `/usr/bin/${type}`,
        `/usr/local/bin/${type}`,
        `/bin/${type}`,
        `/snap/bin/${type}`,
      ]

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // 3. Fallback tự động sang package npm pre-built (@ffmpeg-installer/ffmpeg, @ffprobe-installer/ffprobe)
  try {
    if (type === 'ffmpeg') {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      if (ffmpegInstaller?.path && fs.existsSync(ffmpegInstaller.path)) {
        return ffmpegInstaller.path
      }
    } else {
      const ffprobeInstaller = require('@ffprobe-installer/ffprobe')
      if (ffprobeInstaller?.path && fs.existsSync(ffprobeInstaller.path)) {
        return ffprobeInstaller.path
      }
    }
  } catch (e) {}

  // 4. Mặc định gọi lệnh toàn cục từ PATH hệ thống
  return type
}

const ffmpegPath = resolveBinary('ffmpeg')
const ffprobePath = resolveBinary('ffprobe')

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath)
}

export interface VideoProbeInfo {
  duration: number
  durationFormatted: string
  videoCodec: string
  audioCodec: string
  pixFmt: string
  width?: number
  height?: number
  bitrate?: number
  needTranscode: boolean
}

// Format seconds into HH:MM:SS
export function formatSecondsToTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Probe video metadata
export function probeVideo(filePath: string): Promise<VideoProbeInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Lỗi phân tích video: ${err.message}`))
      }

      const duration = metadata.format.duration || 0
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio')

      const videoCodec = (videoStream?.codec_name || 'unknown').toLowerCase()
      const audioCodec = (audioStream?.codec_name || 'unknown').toLowerCase()
      const pixFmt = (videoStream?.pix_fmt || '').toLowerCase()

      // Chỉ cần re-encode khi codec không phải H.264 (HEVC, VP9, AV1...) hoặc video 10-bit
      const isH264 = videoCodec === 'h264' || videoCodec === 'avc1'
      const is10Bit = pixFmt.includes('10le') || pixFmt.includes('10be')
      const needTranscode = !isH264 || is10Bit

      resolve({
        duration,
        durationFormatted: formatSecondsToTime(duration),
        videoCodec,
        audioCodec,
        pixFmt,
        width: videoStream?.width,
        height: videoStream?.height,
        bitrate: metadata.format.bit_rate,
        needTranscode,
      })
    })
  })
}

export interface SliceOptions {
  inputPath: string
  outputDir: string
  m3u8Path: string
  segmentPattern: string
  progressFile: string
  encodeMode?: 'auto' | 'safe' | 'fast'
  segmentDuration?: number
}

// Chạy chuyển đổi HLS Video
export function sliceVideoHLS(options: SliceOptions): Promise<{ duration: number; segmentsCount: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      const { inputPath, outputDir, m3u8Path, segmentPattern, progressFile, encodeMode = 'auto', segmentDuration = 5 } = options

      const probe = await probeVideo(inputPath)
      const needTranscode = encodeMode === 'safe' || (encodeMode === 'auto' && probe.needTranscode)

      const command = ffmpeg(inputPath)

      if (needTranscode) {
        // Safe Web Re-encode: Tận dụng toàn bộ CPU core (-threads 0) và preset ultrafast
        command
          .outputOptions([
            '-threads 0',
            '-map 0:v:0',
            '-map 0:a:0?',
            '-sn',
            '-dn',
            '-c:v libx264',
            '-preset ultrafast',
            '-tune zerolatency',
            '-profile:v high',
            '-level 4.1',
            '-pix_fmt yuv420p',
            '-g 120',
            '-keyint_min 24',
            '-sc_threshold 0',
            `-force_key_frames expr:gte(t,n_forced*${segmentDuration})`,
            '-c:a aac',
            '-b:a 128k',
            '-ar 44100',
            '-ac 2',
            '-f hls',
            `-hls_time ${segmentDuration}`,
            '-hls_playlist_type vod',
            '-hls_flags independent_segments',
            '-hls_segment_type mpegts',
            `-hls_segment_filename ${segmentPattern}`,
          ])
      } else {
        // Fast Remux: Cực nhanh (1-2s), bảo toàn video gốc và tối ưu tốc độ VPS
        command
          .outputOptions([
            '-threads 0',
            '-map 0:v:0',
            '-map 0:a:0?',
            '-sn',
            '-dn',
            '-c copy',
            '-bsf:v h264_mp4toannexb',
            '-f hls',
            `-hls_time ${segmentDuration}`,
            '-hls_playlist_type vod',
            '-hls_flags independent_segments',
            '-hls_segment_type mpegts',
            `-hls_segment_filename ${segmentPattern}`,
          ])
      }

      // Ghi log tiến trình vào file txt để frontend polling
      command.on('progress', (progress) => {
        try {
          const logData = {
            percent: progress.percent ? Math.round(progress.percent) : 0,
            timemark: progress.timemark,
            currentFps: progress.currentFps,
            currentKbps: progress.currentKbps,
            targetSize: progress.targetSize,
            updatedAt: Date.now(),
          }
          fs.writeFileSync(progressFile, JSON.stringify(logData), 'utf-8')
        } catch (e) {}
      })

      command.on('end', () => {
        try {
          // Đếm số lượng files .ts đã tạo
          const files = fs.readdirSync(outputDir)
          const tsFiles = files.filter((f) => f.endsWith('.ts'))
          resolve({
            duration: probe.duration,
            segmentsCount: tsFiles.length,
          })
        } catch (e) {
          resolve({ duration: probe.duration, segmentsCount: 0 })
        }
      })

      command.on('error', (err) => {
        console.error('FFmpeg slice error:', err)
        reject(new Error(`FFmpeg lỗi: ${err.message}`))
      })

      // Ghi ra file m3u8 master
      command.output(m3u8Path)
      command.run()
    } catch (error) {
      reject(error)
    }
  })
}
