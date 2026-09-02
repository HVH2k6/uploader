import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'

// Thiết lập đường dẫn FFmpeg & FFprobe
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'D:\\ffmpeg\\bin\\ffmpeg.exe'
const FFPROBE_BIN = process.env.FFPROBE_PATH || 'D:\\ffmpeg\\bin\\ffprobe.exe'

if (fs.existsSync(FFMPEG_BIN)) {
  ffmpeg.setFfmpegPath(FFMPEG_BIN)
}
if (fs.existsSync(FFPROBE_BIN)) {
  ffmpeg.setFfprobePath(FFPROBE_BIN)
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
      const pixFmt = (videoStream?.pix_fmt || 'unknown').toLowerCase()

      const isH264 = ['h264', 'avc1'].includes(videoCodec)
      const isAacMp3 = ['aac', 'mp3'].includes(audioCodec)
      const is8Bit = pixFmt === 'unknown' || !pixFmt.includes('10')

      // Cần transcode nếu không phải H.264 8-bit và Audio AAC/MP3
      const needTranscode = !isH264 || !isAacMp3 || !is8Bit

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
        // Safe Web Re-encode: Chuẩn hóa H.264 8-bit YUV420p + AAC Stereo 128k + Keyframe 5s
        command
          .outputOptions([
            '-map 0:v:0',
            '-map 0:a:0?',
            '-sn',
            '-dn',
            '-c:v libx264',
            '-preset veryfast',
            '-profile:v high',
            '-level 4.1',
            '-pix_fmt yuv420p',
            '-g 125',
            '-keyint_min 25',
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
        // Fast Remux: Giữ nguyên Stream H.264/AAC nhưng bảo toàn PTS liên tục
        command
          .outputOptions([
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

      command
        .on('progress', (progress) => {
          try {
            const currentSeconds = progress.timemark
              ? parseTimemarkToSeconds(progress.timemark)
              : (progress.percent || 0) * (probe.duration / 100)
            const percent = probe.duration > 0 ? Math.min(99, Math.round((currentSeconds / probe.duration) * 100)) : 0
            
            const progData = `out_time=${progress.timemark || '00:00:00'}\nout_time_us=${Math.round(currentSeconds * 1000000)}\nspeed=${progress.currentFps ? `${progress.currentFps}fps` : '1.0x'}\nprogress=continue\npercent=${percent}\n`
            fs.writeFileSync(progressFile, progData, 'utf-8')
          } catch (e) {
            // Ignore file write race condition
          }
        })
        .on('end', () => {
          try {
            fs.writeFileSync(progressFile, 'progress=end\npercent=100\n', 'utf-8')
          } catch (e) {}

          const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.ts'))
          resolve({
            duration: probe.duration,
            segmentsCount: files.length,
          })
        })
        .on('error', (err) => {
          reject(new Error(`Lỗi FFmpeg chuyển mã: ${err.message}`))
        })
        .save(m3u8Path)
    } catch (err: any) {
      reject(err)
    }
  })
}

function parseTimemarkToSeconds(timemark: string): number {
  const parts = timemark.split(':')
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0
    const mins = parseFloat(parts[1]) || 0
    const secs = parseFloat(parts[2]) || 0
    return hours * 3600 + mins * 60 + secs
  }
  return 0
}

export default ffmpeg
