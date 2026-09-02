'use client'

import * as React from 'react'
import {
  History,
  Search,
  RefreshCw,
  Copy,
  Check,
  Download,
  Trash2,
  Film,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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

interface HistoryClientProps {
  initialHistories: HistoryItem[]
}

export function HistoryClient({ initialHistories }: HistoryClientProps) {
  const [histories, setHistories] = React.useState<HistoryItem[]>(initialHistories)
  const [isLoading, setIsLoading] = React.useState(false)
  const [filterProvider, setFilterProvider] = React.useState<'ALL' | 'LOTUS' | 'TIKTOK'>('ALL')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const fetchHistory = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/history?limit=100')
      if (res.ok) {
        const data = await res.json()
        setHistories(data.histories || [])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Helper format file size
  const formatFileSize = (bytesStr: string | null): string => {
    if (!bytesStr) return '0 B'
    const bytes = parseInt(bytesStr, 10)
    if (isNaN(bytes) || bytes === 0) return '0 B'
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

  const copyToClipboard = (key: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(key)
    showToast('Đã sao chép liên kết M3U8!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi lịch sử này?')) return

    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setHistories((prev) => prev.filter((h) => h.id !== id))
        showToast('Đã xóa bản ghi thành công.')
      } else {
        showToast('Không thể xóa bản ghi.')
      }
    } catch (e) {
      showToast('Có lỗi xảy ra khi xóa.')
    }
  }

  const filteredHistories = histories.filter((h) => {
    const matchesProvider =
      filterProvider === 'ALL' || h.providerUsed === filterProvider
    const matchesSearch = h.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesProvider && matchesSearch
  })

  const totalBytes = histories.reduce(
    (acc, curr) => acc + (curr.fileSizeBytes ? parseInt(curr.fileSizeBytes, 10) : 0),
    0
  )
  const totalLotus = histories.filter((h) => h.providerUsed === 'LOTUS').length
  const totalTikTok = histories.filter((h) => h.providerUsed === 'TIKTOK').length

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-border bg-popover px-4 py-2.5 text-xs font-medium text-popover-foreground shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Lịch sử Upload
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý và tra cứu toàn bộ các luồng video HLS m3u8 đã tạo trên hệ thống.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          disabled={isLoading}
          className="h-9 gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* Stats Cards Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tổng số video
            </CardTitle>
            <Film className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{histories.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Đã hoàn thành chuyển mã</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tổng dung lượng gốc
            </CardTitle>
            <HardDrive className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatFileSize(totalBytes.toString())}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tiết kiệm bộ nhớ máy chủ</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Lotus CDN Streams
            </CardTitle>
            <span className="text-sm">🌸</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{totalLotus}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Lotus Chat Traffic CDN</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              TikTok Ads Streams
            </CardTitle>
            <span className="text-sm">🎵</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{totalTikTok}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">ByteDance Akamai CDN</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Provider Tabs */}
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium w-fit">
          <button
            onClick={() => setFilterProvider('ALL')}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              filterProvider === 'ALL'
                ? 'bg-background font-semibold text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tất cả ({histories.length})
          </button>
          <button
            onClick={() => setFilterProvider('LOTUS')}
            className={`rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              filterProvider === 'LOTUS'
                ? 'bg-background font-semibold text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>🌸</span>
            <span>Lotus ({totalLotus})</span>
          </button>
          <button
            onClick={() => setFilterProvider('TIKTOK')}
            className={`rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              filterProvider === 'TIKTOK'
                ? 'bg-background font-semibold text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>🎵</span>
            <span>TikTok ({totalTikTok})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên file video..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* History List */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 w-full items-center justify-center text-xs text-muted-foreground">
              <RefreshCw className="size-5 animate-spin mr-2 text-primary" />
              <span>Đang tải lịch sử upload...</span>
            </div>
          ) : filteredHistories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Film className="size-10 stroke-[1.5] mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">Không tìm thấy video nào</p>
              <p className="text-xs mt-0.5">
                {searchQuery
                  ? `Không có kết quả khớp với "${searchQuery}"`
                  : 'Hãy tải lên video đầu tiên trong mục Upload.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredHistories.map((item) => {
                const isLotus = item.providerUsed === 'LOTUS'
                const fullM3u8Url =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${item.m3u8Url}`
                    : item.m3u8Url || ''

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                          isLotus ? 'bg-pink-500/15 text-pink-600' : 'bg-cyan-500/15 text-cyan-600'
                        }`}
                      >
                        {isLotus ? '🌸' : '🎵'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground truncate max-w-sm sm:max-w-md">
                            {item.originalFileName}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-1">
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
                          <span>{formatFileSize(item.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>{formatDuration(item.durationSeconds)}</span>
                          <span>•</span>
                          <span>
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}{' '}
                            {new Date(item.createdAt).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`hist-${item.id}`, fullM3u8Url)}
                        className="h-8 text-xs gap-1.5"
                      >
                        {copiedId === `hist-${item.id}` ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        <span>Sao chép M3U8</span>
                      </Button>

                      {item.m3u8Url && (
                        <a
                          href={`${item.m3u8Url}?download=1`}
                          download
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-foreground"
                          title="Tải file .m3u8 về máy"
                        >
                          <Download className="size-3.5" />
                        </a>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Xóa bản ghi"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
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
