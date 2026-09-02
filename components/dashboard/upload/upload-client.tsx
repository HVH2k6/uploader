'use client'

import * as React from 'react'
import {
  UploadCloud,
  Film,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Shield,
  Layers,
  Sparkles,
  Copy,
  Check,
  Download,
  RefreshCw,
  FileVideo,
  Settings2,
  Server,
  KeyRound,
  ExternalLink,
  ChevronDown,
  X,
  Timer,
  BarChart2,
  ListOrdered,
  Sliders,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MAX_QUEUE_ITEMS = 10
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB
const CHUNK_SIZE = 4 * 1024 * 1024 // 4 MB per chunk upload to server (tối ưu hóa cho mọi Web Server / Nginx / VPS)

function uploadChunkAjax(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress: (loaded: number) => void
): Promise<{ ok: boolean; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v)
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded)
      }
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ok: true, data: json })
        } else {
          resolve({ ok: false, error: json.error || `Lỗi máy chủ (HTTP ${xhr.status})` })
        }
      } catch (e) {
        resolve({ ok: false, error: `Phản hồi không hợp lệ từ server (HTTP ${xhr.status})` })
      }
    }

    xhr.onerror = () => {
      resolve({ ok: false, error: 'Mất kết nối mạng tới VPS hoặc Nginx chặn dung lượng' })
    }

    xhr.send(body)
  })
}

export interface QueueItem {
  id: string
  file: File
  name: string
  size: number
  provider: 'LOTUS' | 'TIKTOK' | 'AUTO'
  encodeMode: 'auto' | 'safe' | 'fast'
  segmentDuration: number // seconds (3, 4, 5, 6, 8, 10)
  status: 'waiting' | 'uploading_file' | 'slicing' | 'uploading_segments' | 'delaying' | 'completed' | 'failed' | 'cancelled'
  fileUploadProgress: number // 0 - 100
  sliceProgress: number // 0 - 100
  segmentsProgress: { completed: number; total: number }
  speed: string
  timeRemaining?: string
  sessionId?: string
  m3u8Url?: string
  historyId?: string
  error?: string
}

export interface HistoryItem {
  id: string
  originalFileName: string
  fileSizeBytes: string | null
  durationSeconds: number | null
  providerUsed: string
  status: string
  m3u8Url: string | null
  createdAt: string
  config?: {
    accountName: string
    provider: string
  }
}

interface UploadClientProps {
  initialHistories?: HistoryItem[]
}

export function UploadClient({ initialHistories = [] }: UploadClientProps) {
  const [queue, setQueue] = React.useState<QueueItem[]>([])
  const queueRef = React.useRef<QueueItem[]>([])
  queueRef.current = queue

  const [isProcessing, setIsProcessing] = React.useState(false)
  const isProcessingRef = React.useRef(false)
  const isCancelledRef = React.useRef<Record<string, boolean>>({})

  // Global Upload Settings
  const [concurrency, setConcurrency] = React.useState<number>(4) // 1 - 10 luồng
  const concurrencyRef = React.useRef<number>(4)
  concurrencyRef.current = concurrency

  const [globalSegmentDuration, setGlobalSegmentDuration] = React.useState<number>(5) // 3s - 15s
  const globalSegmentDurationRef = React.useRef<number>(5)
  globalSegmentDurationRef.current = globalSegmentDuration

  const [autoClearCompleted, setAutoClearCompleted] = React.useState<boolean>(true)
  const autoClearCompletedRef = React.useRef<boolean>(true)
  autoClearCompletedRef.current = autoClearCompleted

  const [showSettings, setShowSettings] = React.useState<boolean>(false)

  const [activeCooldown, setActiveCooldown] = React.useState<{ itemId: string; seconds: number } | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const [recentHistories, setRecentHistories] = React.useState<HistoryItem[]>(initialHistories)
  const [loadingHistory, setLoadingHistory] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Fetch History
  const fetchRecentHistories = React.useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/history?limit=10')
      if (res.ok) {
        const data = await res.json()
        setRecentHistories(data.histories || [])
      }
    } catch (e) {
      console.error('Error fetching history:', e)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  // Helper format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Helper format duration
  const formatDuration = (seconds?: number | null): string => {
    if (!seconds) return '--:--'
    const total = Math.round(seconds)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Handle files dropped / selected
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newItems: QueueItem[] = []
    const currentCount = queueRef.current.length

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Check max queue limit (10 videos)
      if (currentCount + newItems.length >= MAX_QUEUE_ITEMS) {
        showToast(`⚠️ Tối đa chỉ được thêm ${MAX_QUEUE_ITEMS} video vào hàng đợi cùng lúc.`)
        break
      }

      // Check file size (max 5 GB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast(`❌ File "${file.name}" vượt quá dung lượng tối đa cho phép (5 GB).`)
        continue
      }

      newItems.push({
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        provider: 'LOTUS',
        encodeMode: 'auto',
        segmentDuration: globalSegmentDurationRef.current,
        status: 'waiting',
        fileUploadProgress: 0,
        sliceProgress: 0,
        segmentsProgress: { completed: 0, total: 0 },
        speed: '0 KB/s',
      })
    }

    if (newItems.length > 0) {
      setQueue((prev) => {
        const next = [...prev, ...newItems]
        queueRef.current = next
        return next
      })
      showToast(`✅ Đã thêm ${newItems.length} video vào hàng đợi.`)
    }
  }

  // Update item options
  const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      queueRef.current = next
      return next
    })
  }

  // Remove item from queue
  const removeQueueItem = async (id: string) => {
    const item = queueRef.current.find((q) => q.id === id)
    if (item && item.sessionId && (item.status === 'uploading_file' || item.status === 'slicing')) {
      isCancelledRef.current[id] = true
      try {
        await fetch('/api/upload/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: item.sessionId }),
        })
      } catch (e) {}
    }
    setQueue((prev) => {
      const next = prev.filter((q) => q.id !== id)
      queueRef.current = next
      return next
    })
  }

  // Clear completed items
  const clearCompleted = () => {
    setQueue((prev) => {
      const next = prev.filter((q) => q.status !== 'completed' && q.status !== 'failed' && q.status !== 'cancelled')
      queueRef.current = next
      return next
    })
    showToast('🧹 Đã dọn dẹp các video đã hoàn tất.')
  }

  // Clear all
  const clearAll = () => {
    if (isProcessing) {
      isProcessingRef.current = false
      setIsProcessing(false)
    }
    setQueue([])
    queueRef.current = []
  }

  // Copy helper
  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(key)
    showToast('Đã sao chép liên kết vào bộ nhớ tạm!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Main Queue Processor
  const processQueue = async () => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setIsProcessing(true)

    while (isProcessingRef.current) {
      // Find first waiting item using queueRef.current (ALWAYS fresh and NOT captured in stale closure)
      const currentItem = queueRef.current.find((item) => item.status === 'waiting')
      if (!currentItem) {
        break
      }

      const itemId = currentItem.id

      try {
        // --- BƯỚC 1: KHỞI TẠO PHIÊN UPLOAD ---
        updateQueueItem(itemId, { status: 'uploading_file', fileUploadProgress: 0, speed: 'Đang khởi tạo...' })

        const initRes = await fetch('/api/upload/init', { method: 'POST' })
        if (!initRes.ok) throw new Error('Không thể khởi tạo phiên upload trên server')
        const initData = await initRes.json()
        const sessionId = initData.sessionId
        updateQueueItem(itemId, { sessionId })

        // --- BƯỚC 2: TẢI FILE THEO CHUNK LÊN SERVER (RAW BINARY, HỖ TRỢ 5GB VÀ TIẾNG VIỆT) ---
        const file = currentItem.file
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
        let uploadedBytes = 0
        const startTime = Date.now()
        let lastInputFileName = 'input.mp4'

        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
          if (isCancelledRef.current[itemId] || !isProcessingRef.current) {
            throw new Error('Đã hủy tải lên')
          }

          const start = chunkIdx * CHUNK_SIZE
          const end = Math.min(start + CHUNK_SIZE, file.size)
          const chunkBlob = file.slice(start, end)

          const chunkRes = await uploadChunkAjax(
            '/api/upload/chunk',
            {
              'x-session-id': sessionId,
              'x-chunk-index': chunkIdx.toString(),
              'x-total-chunks': totalChunks.toString(),
              'x-file-name': encodeURIComponent(file.name),
              'Content-Type': 'application/octet-stream',
            },
            chunkBlob,
            (loadedInChunk) => {
              const currentTotalUploaded = uploadedBytes + loadedInChunk
              const elapsedSecs = Math.max(0.1, (Date.now() - startTime) / 1000)
              const speedMBs = (currentTotalUploaded / (1024 * 1024) / elapsedSecs).toFixed(1)
              const percent = Math.min(99, Math.round((currentTotalUploaded / file.size) * 100))
              const remainingBytes = file.size - currentTotalUploaded
              const remainingSecs = Math.round(remainingBytes / Math.max(1, currentTotalUploaded / elapsedSecs))
              const etaFormatted = remainingSecs > 0 ? `• Còn ~${remainingSecs}s` : ''

              updateQueueItem(itemId, {
                fileUploadProgress: percent,
                speed: `${speedMBs} MB/s ${etaFormatted}`,
              })
            }
          )

          if (!chunkRes.ok) {
            throw new Error(chunkRes.error || `Lỗi tải phân đoạn file (${chunkIdx + 1}/${totalChunks})`)
          }

          if (chunkRes.data?.inputFileName) {
            lastInputFileName = chunkRes.data.inputFileName
          }

          uploadedBytes += end - start
          const elapsedSecs = Math.max(0.1, (Date.now() - startTime) / 1000)
          const speedMBs = (uploadedBytes / (1024 * 1024) / elapsedSecs).toFixed(1)
          const percent = Math.min(99, Math.round((uploadedBytes / file.size) * 100))

          updateQueueItem(itemId, {
            fileUploadProgress: percent,
            speed: `${speedMBs} MB/s`,
          })
        }

        updateQueueItem(itemId, { fileUploadProgress: 100 })

        // --- BƯỚC 3: KÍCH HOẠT FFMPEG CẮT HLS PHÂN ĐOẠN (THEO SỐ GIÂY ĐÃ CHỌN) ---
        const segSecs = currentItem.segmentDuration || globalSegmentDurationRef.current || 5
        updateQueueItem(itemId, {
          status: 'slicing',
          sliceProgress: 0,
          speed: `FFmpeg đang cắt ${segSecs}s/segment...`,
        })

        const sliceRes = await fetch('/api/upload/slice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            inputFileName: lastInputFileName,
            encodeMode: currentItem.encodeMode,
            segmentDuration: segSecs,
          }),
        })

        if (!sliceRes.ok) {
          const sliceErr = await sliceRes.json().catch(() => ({}))
          throw new Error(sliceErr.error || 'Lỗi khởi chạy FFmpeg cắt video')
        }

        const sliceInit = await sliceRes.json()
        const totalDuration = sliceInit.duration || 0

        // --- BƯỚC 4: POLLING TIẾN TRÌNH CẮT FFMPEG ---
        let sliceFinished = false
        let segmentsList: { name: string; size: number }[] = []
        let m3u8TemplateContent = ''

        while (!sliceFinished) {
          if (isCancelledRef.current[itemId] || !isProcessingRef.current) {
            throw new Error('Đã dừng tiến trình cắt')
          }

          await new Promise((r) => setTimeout(r, 900))

          const pollRes = await fetch(`/api/upload/slice-progress?sessionId=${sessionId}`)
          if (!pollRes.ok) continue

          const pollData = await pollRes.json()
          if (!pollData.ok) throw new Error(pollData.error || 'Lỗi xử lý FFmpeg')

          updateQueueItem(itemId, {
            sliceProgress: pollData.progressPercent || 0,
            speed: `${pollData.speed || '1.0x'} (${pollData.chunksCreated || 0} chunks)`,
            timeRemaining: pollData.outTime ? `${pollData.outTime} / ${pollData.totalTime}` : undefined,
          })

          if (pollData.isDone) {
            sliceFinished = true
            segmentsList = pollData.segments || []
            m3u8TemplateContent = pollData.m3u8Content || ''
          }
        }

        if (segmentsList.length === 0) {
          throw new Error('Không tạo được phân đoạn TS nào từ video gốc')
        }

        // --- BƯỚC 5: UPLOAD CÁC PHÂN ĐOẠN TS LÊN CDN VỚI SỐ LUỒNG TÙY CHỈNH ---
        const currentConcurrency = concurrencyRef.current || 4
        updateQueueItem(itemId, {
          status: 'uploading_segments',
          segmentsProgress: { completed: 0, total: segmentsList.length },
          speed: `Đang gửi ${currentConcurrency} luồng...`,
        })

        const segmentsMapping: Record<string, string> = {}
        let completedSegments = 0
        const segmentUploadStartTime = Date.now()

        // Batch upload song song với số luồng concurrency được cấu hình
        const queueChunks = [...segmentsList]
        const actualWorkersCount = Math.min(currentConcurrency, segmentsList.length)
        const workers = Array(actualWorkersCount)
          .fill(null)
          .map(async () => {
            while (queueChunks.length > 0) {
              if (isCancelledRef.current[itemId] || !isProcessingRef.current) {
                throw new Error('Đã hủy upload segments')
              }

              const seg = queueChunks.shift()
              if (!seg) break

              // Xác định Provider upload cho phân đoạn này
              let targetProvider = currentItem?.provider || 'LOTUS'
              if (targetProvider === 'AUTO') {
                targetProvider = Math.random() > 0.5 ? 'LOTUS' : 'TIKTOK'
              }

              const segRes = await fetch('/api/upload/segment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  segmentName: seg.name,
                  provider: targetProvider,
                  cdnMode: 'traffic_fixed',
                }),
              })

              if (!segRes.ok) {
                const segErr = await segRes.json().catch(() => ({}))
                throw new Error(segErr.error || `Lỗi upload phân đoạn ${seg.name}`)
              }

              const segData = await segRes.json()
              segmentsMapping[seg.name] = segData.cdnUrl

              completedSegments++
              const elapsed = Math.max(0.1, (Date.now() - segmentUploadStartTime) / 1000)
              const segSpeed = (completedSegments / elapsed).toFixed(1)

              updateQueueItem(itemId, {
                segmentsProgress: { completed: completedSegments, total: segmentsList.length },
                speed: `${segSpeed} seg/s (${currentConcurrency} luồng)`,
              })
            }
          })

        await Promise.all(workers)

        // --- BƯỚC 6: FINALIZE M3U8, LƯU DB & DỌN DẸP SẠCH SẼ THƯ MỤC TẠM ---
        updateQueueItem(itemId, { speed: 'Đang tổng hợp playlist...' })

        const finalizeRes = await fetch('/api/upload/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            originalFileName: file.name,
            fileSizeBytes: file.size,
            durationSeconds: totalDuration,
            providerUsed: currentItem.provider,
            segmentsMapping,
            m3u8Template: m3u8TemplateContent,
          }),
        })

        if (!finalizeRes.ok) {
          const finalErr = await finalizeRes.json().catch(() => ({}))
          throw new Error(finalErr.error || 'Lỗi hoàn tất playlist M3U8')
        }

        const finalizeData = await finalizeRes.json()

        // Thêm ngay vào đầu danh sách lịch sử hiển thị
        const newHistoryItem: HistoryItem = {
          id: finalizeData.historyId,
          originalFileName: file.name,
          fileSizeBytes: file.size.toString(),
          durationSeconds: totalDuration,
          providerUsed: currentItem.provider,
          status: 'COMPLETED',
          m3u8Url: finalizeData.m3u8Url,
          createdAt: new Date().toISOString(),
        }
        setRecentHistories((prev) => [newHistoryItem, ...prev.filter((h) => h.id !== newHistoryItem.id)])

        showToast(`🎉 Video "${file.name}" đã upload thành công!`)

        // XÓA FILE THÀNH CÔNG KHỎI HÀNG ĐỢI HOẶC ĐỔI TRẠNG THÁI 'COMPLETED' ĐỂ KHÔNG BAO GIỜ BỊ LẶP LẠI
        if (autoClearCompletedRef.current) {
          setQueue((prev) => {
            const next = prev.filter((q) => q.id !== itemId)
            queueRef.current = next
            return next
          })
        } else {
          updateQueueItem(itemId, {
            status: 'completed',
            m3u8Url: finalizeData.m3u8Url,
            historyId: finalizeData.historyId,
            speed: 'Hoàn tất 100%',
          })
        }

        // --- BƯỚC 7: NGHỈ NGẪU NHIÊN 5S - 7S CHỐNG RATE LIMIT / BAN BOT ---
        const remainingWaiting = queueRef.current.filter((q) => q.id !== itemId && q.status === 'waiting')
        if (remainingWaiting.length > 0 && isProcessingRef.current) {
          const cooldownSecs = parseFloat((5 + Math.random() * 2).toFixed(1)) // 5.0s - 7.0s
          setActiveCooldown({ itemId, seconds: cooldownSecs })

          // Đếm ngược hiển thị UI
          let leftSec = cooldownSecs
          while (leftSec > 0 && isProcessingRef.current) {
            setActiveCooldown({ itemId, seconds: parseFloat(leftSec.toFixed(1)) })
            await new Promise((r) => setTimeout(r, 200))
            leftSec -= 0.2
          }

          setActiveCooldown(null)
        }
      } catch (err: any) {
        console.error('Queue item error:', err)
        updateQueueItem(itemId, {
          status: 'failed',
          error: err.message || 'Lỗi không xác định',
          speed: 'Thất bại',
        })
        showToast(`❌ Lỗi xử lý "${currentItem?.name}": ${err.message}`)
      }
    }

    isProcessingRef.current = false
    setIsProcessing(false)
    setActiveCooldown(null)
  }

  // Pause / Stop Queue
  const toggleQueueProcessing = () => {
    if (isProcessing) {
      isProcessingRef.current = false
      setIsProcessing(false)
      setActiveCooldown(null)
      showToast('⏸️ Đã tạm dừng hàng đợi.')
    } else {
      processQueue()
    }
  }

  const completedCount = queue.filter((q) => q.status === 'completed').length
  const totalQueueCount = queue.length
  const overallProgress = totalQueueCount > 0 ? Math.round((completedCount / totalQueueCount) * 100) : 0

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-border bg-popover px-4 py-3 text-xs font-medium text-popover-foreground shadow-2xl animate-in slide-in-from-bottom-5">
          <Sparkles className="size-4 text-pink-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Upload Video HLS
            </h1>
            <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/30 text-primary">
              Tối đa 10 video • 5 GB/file
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cắt HLS đa phân đoạn, phân phối tải đa kênh Lotus CDN & TikTok Ads, tùy chỉnh luồng và giây cắt.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Settings Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={`h-9 gap-1.5 text-xs font-medium ${showSettings ? 'border-primary text-primary bg-primary/5' : ''}`}
            title="Cài đặt tham số nâng cao"
          >
            <Sliders className="size-3.5" />
            <span>Tùy chỉnh ({concurrency} luồng • {globalSegmentDuration}s)</span>
          </Button>

          {queue.length > 0 && (
            <>
              <Button
                variant={isProcessing ? 'secondary' : 'default'}
                size="sm"
                onClick={toggleQueueProcessing}
                className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
              >
                {isProcessing ? (
                  <>
                    <Pause className="size-3.5" />
                    <span>Tạm dừng</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 fill-current" />
                    <span>Bắt đầu ({queue.filter((q) => q.status === 'waiting').length})</span>
                  </>
                )}
              </Button>

              {completedCount > 0 && !autoClearCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3.5" />
                  <span>Dọn đã xong</span>
                </Button>
              )}
            </>
          )}

          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            <UploadCloud className="size-4" />
            <span>Chọn Video</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              handleFilesSelected(e.target.files)
              e.target.value = ''
            }}
            multiple
            accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.ts"
            className="hidden"
          />
        </div>
      </div>

      {/* Advanced Global Settings Bar (Collapsible) */}
      {showSettings && (
        <Card className="border border-border/80 bg-muted/20 shadow-xs animate-in slide-in-from-top-3 duration-200">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* 1. Số luồng upload CDN */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-500" />
                  <span>Số luồng upload CDN song song</span>
                </span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {concurrency} luồng
                </Badge>
              </Label>
              <div className="flex items-center gap-1">
                {[1, 2, 4, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setConcurrency(num)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      concurrency === num
                        ? 'border-primary bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tăng số luồng để upload nhiều phân đoạn .ts cùng lúc (Khuyên dùng: 4 - 6 luồng)
              </p>
            </div>

            {/* 2. Số giây video cắt */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-blue-500" />
                  <span>Độ dài mỗi phân đoạn cắt (giây)</span>
                </span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {globalSegmentDuration}s/segment
                </Badge>
              </Label>
              <div className="flex items-center gap-1">
                {[3, 4, 5, 6, 8, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setGlobalSegmentDuration(sec)
                      setQueue((prev) => {
                        const next = prev.map((item) =>
                          item.status === 'waiting' ? { ...item, segmentDuration: sec } : item
                        )
                        queueRef.current = next
                        return next
                      })
                    }}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      globalSegmentDuration === sec
                        ? 'border-primary bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Mỗi phân đoạn video dài {globalSegmentDuration} giây (Chuẩn HLS tối ưu: 4s - 6s)
              </p>
            </div>

            {/* 3. Tự động xóa file hoàn tất khỏi hàng đợi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckCheck className="size-3.5 text-emerald-500" />
                <span>Tránh upload lại (Clear khi xong)</span>
              </Label>
              <button
                type="button"
                onClick={() => setAutoClearCompleted(!autoClearCompleted)}
                className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                  autoClearCompleted
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                <span>Tự động dọn file xong khỏi hàng đợi:</span>
                <Badge variant={autoClearCompleted ? 'default' : 'outline'} className="text-[10px]">
                  {autoClearCompleted ? 'Bật (Khuyên dùng)' : 'Tắt'}
                </Badge>
              </button>
              <p className="text-[10px] text-muted-foreground">
                Khi upload xong, file sẽ tự động xóa khỏi hàng đợi và chuyển xuống Lịch sử để tránh bấm nhầm upload lại.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anti-Ban Cooldown Delay Banner */}
      {activeCooldown && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300 animate-pulse shadow-xs">
          <div className="flex items-center gap-2.5">
            <Timer className="size-4 shrink-0 text-amber-500" />
            <div>
              <span className="font-semibold">Nghỉ an toàn chống giới hạn API:</span>{' '}
              <span>Hệ thống đang tạm nghỉ ngẫu nhiên ({activeCooldown.seconds}s) để bảo vệ tài khoản bot trước khi xử lý video kế tiếp...</span>
            </div>
          </div>
          <Badge className="bg-amber-500 text-white font-mono text-xs">
            {activeCooldown.seconds.toFixed(1)}s
          </Badge>
        </div>
      )}

      {/* Drag and Drop Zone */}
      {queue.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFilesSelected(e.dataTransfer.files)
          }}
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-card p-12 text-center transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 cursor-pointer shadow-xs"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 transition-transform group-hover:scale-110">
            <UploadCloud className="size-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Kéo và thả video vào đây hoặc bấm để duyệt file
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Hỗ trợ định dạng MP4, MKV, AVI, MOV, WEBM, TS. Tối đa 5 GB mỗi file, xếp hàng đợi tối đa 10 video.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-pink-500/20 bg-pink-500/5 px-2.5 py-1 text-[11px] font-medium text-pink-600 dark:text-pink-400">
              <span>🌸</span>
              <span>Lotus Bot CDN</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-[11px] font-medium text-cyan-600 dark:text-cyan-400">
              <span>🎵</span>
              <span>TikTok Ads CDN</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Zap className="size-3 text-amber-500" />
              <span>{concurrency} luồng song song</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Clock className="size-3 text-blue-500" />
              <span>Cắt {globalSegmentDuration}s/segment</span>
            </div>
          </div>
        </div>
      ) : (
        /* Active Queue List */
        <div className="flex flex-col gap-4">
          {/* Queue Summary Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Hàng đợi ({queue.length}/{MAX_QUEUE_ITEMS} video)
                </span>
                <span className="text-xs text-muted-foreground">
                  • Cấu hình: {concurrency} luồng • {globalSegmentDuration}s/seg
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={queue.length >= MAX_QUEUE_ITEMS}
                  className="h-8 text-xs gap-1"
                >
                  <UploadCloud className="size-3.5" />
                  <span>Thêm video</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  <span>Xóa tất cả</span>
                </Button>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Tiến độ tổng thể</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Queue Items */}
          <div className="grid gap-3">
            {queue.map((item, index) => {
              const isItemActive =
                item.status === 'uploading_file' ||
                item.status === 'slicing' ||
                item.status === 'uploading_segments' ||
                item.status === 'delaying'

              const isCompleted = item.status === 'completed'
              const isFailed = item.status === 'failed'

              return (
                <Card
                  key={item.id}
                  className={`overflow-hidden border transition-all duration-200 ${
                    isItemActive
                      ? 'border-primary/40 bg-card shadow-md ring-1 ring-primary/20'
                      : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isFailed
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border/80 bg-card'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Item Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : isFailed
                              ? 'bg-destructive/15 text-destructive'
                              : isItemActive
                              ? 'bg-primary/15 text-primary animate-pulse'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="size-5" /> : <Film className="size-5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                            <span className="font-semibold text-sm text-foreground truncate max-w-md">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{formatFileSize(item.size)}</span>
                            <span>•</span>
                            <span className="font-mono">{item.speed}</span>
                            {item.timeRemaining && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{item.timeRemaining}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isCompleted ? (
                          <Badge className="bg-emerald-500 text-white text-[11px] gap-1">
                            <CheckCircle2 className="size-3" />
                            <span>Hoàn thành</span>
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="destructive" className="text-[11px] gap-1">
                            <AlertCircle className="size-3" />
                            <span>Thất bại</span>
                          </Badge>
                        ) : isItemActive ? (
                          <Badge className="bg-primary text-primary-foreground text-[11px] gap-1 animate-pulse">
                            <RefreshCw className="size-3 animate-spin" />
                            <span>
                              {item.status === 'uploading_file'
                                ? `Tải file: ${item.fileUploadProgress}%`
                                : item.status === 'slicing'
                                ? `FFmpeg cắt: ${item.sliceProgress}%`
                                : item.status === 'uploading_segments'
                                ? `Upload: ${item.segmentsProgress.completed}/${item.segmentsProgress.total}`
                                : 'Đang xử lý'}
                            </span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            Chờ xử lý
                          </Badge>
                        )}

                        {!isItemActive && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeQueueItem(item.id)}
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="Xóa khỏi hàng đợi"
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Configuration Options per video (Editable before start) */}
                    {!isCompleted && !isItemActive && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/60">
                        {/* Provider Selector for this video */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Nguồn upload video:</Label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQueueItem(item.id, { provider: 'LOTUS' })}
                              className={`flex-1 flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                                item.provider === 'LOTUS'
                                  ? 'border-pink-500/50 bg-pink-500/10 text-pink-600 dark:text-pink-400 font-semibold shadow-xs'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <span>🌸</span>
                              <span>Lotus</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateQueueItem(item.id, { provider: 'TIKTOK' })}
                              className={`flex-1 flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                                item.provider === 'TIKTOK'
                                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <span>🎵</span>
                              <span>TikTok</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateQueueItem(item.id, { provider: 'AUTO' })}
                              className={`px-2.5 flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                                item.provider === 'AUTO'
                                  ? 'border-primary/50 bg-primary/10 text-primary font-semibold shadow-xs'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                              }`}
                              title="Tự động phân phối tải ngẫu nhiên"
                            >
                              <span>🔀</span>
                            </button>
                          </div>
                        </div>

                        {/* Encoding Mode */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Chế độ FFmpeg:</Label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQueueItem(item.id, { encodeMode: 'auto' })}
                              className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                                item.encodeMode === 'auto'
                                  ? 'border-primary/50 bg-primary/10 text-primary font-semibold shadow-xs'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              Tự động
                            </button>
                            <button
                              type="button"
                              onClick={() => updateQueueItem(item.id, { encodeMode: 'fast' })}
                              className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                                item.encodeMode === 'fast'
                                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                              }`}
                              title="Fast Remux: Không encode lại nếu đã là H.264"
                            >
                              Fast Remux
                            </button>
                            <button
                              type="button"
                              onClick={() => updateQueueItem(item.id, { encodeMode: 'safe' })}
                              className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                                item.encodeMode === 'safe'
                                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                              }`}
                              title="Re-encode: Chuẩn hóa Web Safe"
                            >
                              Web Safe
                            </button>
                          </div>
                        </div>

                        {/* Segment Duration for this video */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Giây cắt video:</Label>
                          <div className="flex items-center gap-1">
                            {[3, 5, 8, 10].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => updateQueueItem(item.id, { segmentDuration: s })}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                  (item.segmentDuration || globalSegmentDuration) === s
                                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {s}s
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progress Bars for Active Item */}
                    {isItemActive && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        {/* Step 1: Uploading File */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">1. Tải video lên server:</span>
                            <span className="font-mono text-foreground font-medium">{item.fileUploadProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all duration-200"
                              style={{ width: `${item.fileUploadProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Step 2: Slicing */}
                        {item.fileUploadProgress === 100 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                2. FFmpeg cắt HLS ({item.segmentDuration || 5}s/segment):
                              </span>
                              <span className="font-mono text-foreground font-medium">{item.sliceProgress}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-amber-500 transition-all duration-200"
                                style={{ width: `${item.sliceProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Step 3: Segment Uploading */}
                        {item.sliceProgress === 100 && item.segmentsProgress.total > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                3. Phân phối CDN ({concurrency} luồng • {item.provider === 'LOTUS' ? '🌸 Lotus' : '🎵 TikTok'}):
                              </span>
                              <span className="font-mono text-foreground font-medium">
                                {item.segmentsProgress.completed} / {item.segmentsProgress.total} (
                                {Math.round((item.segmentsProgress.completed / item.segmentsProgress.total) * 100)}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-200"
                                style={{
                                  width: `${(item.segmentsProgress.completed / item.segmentsProgress.total) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Completed Result Bar */}
                    {isCompleted && item.m3u8Url && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge className="bg-emerald-600 text-white text-[10px]">Master M3U8</Badge>
                          <span className="font-mono text-foreground truncate max-w-xs sm:max-w-md">
                            {window.location.origin}
                            {item.m3u8Url}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copyToClipboard(item.id, `${window.location.origin}${item.m3u8Url}`)
                            }
                            className="h-7 text-xs gap-1"
                          >
                            {copiedId === item.id ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            <span>Sao chép</span>
                          </Button>

                          <a
                            href={`${item.m3u8Url}?download=1`}
                            download
                            className="inline-flex items-center gap-1 h-7 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted transition-colors text-foreground"
                          >
                            <Download className="size-3" />
                            <span>Tải file</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Error display */}
                    {isFailed && item.error && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                        {item.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Uploads Section */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Lịch sử Upload gần đây
            </CardTitle>
            <CardDescription className="text-xs">
              Các video đã hoàn thành chuyển mã và phân phối CDN
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchRecentHistories}
            disabled={loadingHistory}
            className="size-8 text-muted-foreground hover:text-foreground"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`size-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent>
          {loadingHistory ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              <RefreshCw className="size-4 animate-spin mr-2" />
              <span>Đang tải lịch sử...</span>
            </div>
          ) : recentHistories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              <span>Chưa có video nào trong lịch sử upload.</span>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentHistories.map((h) => {
                const isLotus = h.providerUsed === 'LOTUS'
                const fullM3u8Url = typeof window !== 'undefined' ? `${window.location.origin}${h.m3u8Url}` : h.m3u8Url || ''

                return (
                  <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                          isLotus ? 'bg-pink-500/15 text-pink-600' : 'bg-cyan-500/15 text-cyan-600'
                        }`}
                      >
                        {isLotus ? '🌸' : '🎵'}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-sm sm:max-w-md">
                          {h.originalFileName}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                              isLotus
                                ? 'bg-pink-500/10 text-pink-600 border-pink-500/20'
                                : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
                            }`}
                          >
                            {isLotus ? 'Lotus CDN' : 'TikTok Ads'}
                          </Badge>
                          <span>{h.fileSizeBytes ? formatFileSize(parseInt(h.fileSizeBytes, 10)) : ''}</span>
                          <span>•</span>
                          <span>{formatDuration(h.durationSeconds)}</span>
                          <span>•</span>
                          <span>{new Date(h.createdAt).toLocaleTimeString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`hist-${h.id}`, fullM3u8Url)}
                        className="h-7 text-xs gap-1"
                      >
                        {copiedId === `hist-${h.id}` ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>Sao chép M3U8</span>
                      </Button>

                      {h.m3u8Url && (
                        <a
                          href={`${h.m3u8Url}?download=1`}
                          download
                          className="inline-flex items-center gap-1 h-7 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted transition-colors text-foreground"
                          title="Tải file .m3u8"
                        >
                          <Download className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
