'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  UploadCloud,
  Film,
  HardDrive,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Download,
  Calendar,
  Play,
  Copy,
  Check,
  MoreVertical,
  Plus,
  RefreshCw,
  Sparkles,
  Server,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileVideo,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface HistoryItem {
  id: string
  originalFileName: string
  fileSizeBytes: string | null
  durationSeconds: number | null
  providerUsed: string
  status: string
  m3u8Url: string | null
  createdAt: string
}

export default function DashboardPage() {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [histories, setHistories] = React.useState<HistoryItem[]>([])
  const [configsCount, setConfigsCount] = React.useState({ total: 0, lotus: 0, tiktok: 0 })
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [histRes, confRes] = await Promise.all([
        fetch('/api/history?limit=10'),
        fetch('/api/configs'),
      ])

      if (histRes.ok) {
        const hData = await histRes.json()
        setHistories(hData.histories || [])
      }

      if (confRes.ok) {
        const cData = await confRes.json()
        const configs = cData.configs || []
        setConfigsCount({
          total: configs.length,
          lotus: configs.filter((c: any) => c.provider === 'LOTUS').length,
          tiktok: configs.filter((c: any) => c.provider === 'TIKTOK').length,
        })
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const copyUrl = (id: string, url: string) => {
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url
    navigator.clipboard.writeText(fullUrl)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Format file size helper
  const formatFileSize = (bytesStr: string | null): string => {
    if (!bytesStr) return '0 B'
    const bytes = parseInt(bytesStr, 10)
    if (isNaN(bytes) || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Format duration
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

  const totalBytes = histories.reduce(
    (acc, curr) => acc + (curr.fileSizeBytes ? parseInt(curr.fileSizeBytes, 10) : 0),
    0
  )

  const stats = [
    {
      title: 'Tổng Video Đã Upload',
      value: histories.length.toString(),
      subtitle: 'HLS Master Playlists',
      icon: Film,
      progress: Math.min(100, histories.length * 10),
      color: 'text-primary',
    },
    {
      title: 'Dung Lượng Tiết Kiệm',
      value: formatFileSize(totalBytes.toString()),
      subtitle: 'Được phân phối qua CDN',
      icon: HardDrive,
      progress: 65,
      color: 'text-emerald-500',
    },
    {
      title: 'Lotus CDN Bots',
      value: `${configsCount.lotus} Bots`,
      subtitle: 'Active Tokens & Chat IDs',
      icon: Activity,
      progress: 80,
      color: 'text-pink-500',
    },
    {
      title: 'TikTok Ads Accounts',
      value: `${configsCount.tiktok} Accounts`,
      subtitle: 'Active Cookie Sessions',
      icon: Server,
      progress: 50,
      color: 'text-cyan-500',
    },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tổng quan Hệ thống
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Giám sát thời gian thực tiến trình upload HLS, băng thông CDN phân phối và quản lý tài khoản.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </Button>

          <Link href="/dashboard/upload">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs">
              <Plus className="size-4" />
              <span>Tải lên Video mới</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Stats Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="relative overflow-hidden border border-border/80 shadow-xs hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className={`text-2xl font-bold tracking-tight ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {stat.subtitle}
                </div>

                {/* Micro Progress Bar */}
                <div className="pt-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${stat.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Launch Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-pink-500/10 to-cyan-500/10 p-6 shadow-xs">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-lg">🚀</span>
            <h3 className="text-base font-bold text-foreground">
              Bắt đầu tải lên & cắt HLS tự động
            </h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Hỗ trợ hàng đợi tối đa 10 video, dung lượng đến 5 GB mỗi file. Tự động chuyển đổi sang định dạng phát trực tuyến m3u8 và đẩy lên hạ tầng Lotus/TikTok CDN.
          </p>
        </div>

        <Link href="/dashboard/upload">
          <Button className="h-10 px-5 text-xs font-semibold bg-primary text-primary-foreground shadow-md gap-2 shrink-0">
            <UploadCloud className="size-4" />
            <span>Mở giao diện Upload</span>
          </Button>
        </Link>
      </div>

      {/* Recent Videos Table */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Video mới chuyển mã
            </CardTitle>
            <CardDescription className="text-xs">
              Danh sách các luồng HLS phát trực tuyến vừa tạo
            </CardDescription>
          </div>
          <Link href="/dashboard/history">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary">
              <span>Xem tất cả</span>
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
              <RefreshCw className="size-4 animate-spin mr-2" />
              <span>Đang tải danh sách...</span>
            </div>
          ) : histories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground border-t border-border/60">
              <span>Chưa có video nào được upload. Hãy bấm nút "Tải lên Video mới" ở trên để bắt đầu!</span>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {histories.map((video) => {
                const isLotus = video.providerUsed === 'LOTUS'
                const fullM3u8Url =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${video.m3u8Url}`
                    : video.m3u8Url || ''

                return (
                  <div
                    key={video.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
                          isLotus ? 'bg-pink-500/15 text-pink-600' : 'bg-cyan-500/15 text-cyan-600'
                        }`}
                      >
                        {isLotus ? '🌸' : '🎵'}
                      </div>

                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground truncate block max-w-sm sm:max-w-md">
                          {video.originalFileName}
                        </span>
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
                          <span>{formatFileSize(video.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>{formatDuration(video.durationSeconds)}</span>
                          <span>•</span>
                          <span>{new Date(video.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyUrl(video.id, video.m3u8Url || '')}
                        className="h-7 text-xs gap-1"
                      >
                        {copiedId === video.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>Sao chép M3U8</span>
                      </Button>

                      {video.m3u8Url && (
                        <a
                          href={`${video.m3u8Url}?download=1`}
                          download
                          className="inline-flex items-center justify-center size-7 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors text-foreground"
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