'use client'

import * as React from 'react'
import {
  Plus,
  RefreshCw,
  Search,
  Check,
  Copy,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Sliders,
  CheckCircle2,
  XCircle,
  Film,
  Server,
  Key,
  Cookie as CookieIcon,
  Globe,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LotusModal, type LotusConfigData } from '@/components/dashboard/configs/lotus-modal'
import { TiktokModal, type TiktokConfigData } from '@/components/dashboard/configs/tiktok-modal'
import { DeleteConfigModal } from '@/components/dashboard/configs/delete-modal'

export interface ConfigItem {
  id: number
  userId: string
  provider: 'LOTUS' | 'TIKTOK'
  accountName: string
  botToken?: string | null
  chatId?: string | null
  cookie?: string | null
  csrfToken?: string | null
  referer?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    histories: number
  }
}

interface ConfigsClientProps {
  initialConfigs: ConfigItem[]
}

export function ConfigsClient({ initialConfigs }: ConfigsClientProps) {
  const [configs, setConfigs] = React.useState<ConfigItem[]>(initialConfigs)
  const [isLoading, setIsLoading] = React.useState(false)
  const [filterProvider, setFilterProvider] = React.useState<'ALL' | 'LOTUS' | 'TIKTOK'>('ALL')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Modals state
  const [lotusModalOpen, setLotusModalOpen] = React.useState(false)
  const [selectedLotus, setSelectedLotus] = React.useState<LotusConfigData | null>(null)

  const [tiktokModalOpen, setTiktokModalOpen] = React.useState(false)
  const [selectedTiktok, setSelectedTiktok] = React.useState<TiktokConfigData | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<ConfigItem | null>(null)

  // Visibility states for sensitive data
  const [visibleSecrets, setVisibleSecrets] = React.useState<Record<number, boolean>>({})
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const fetchConfigs = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/configs')
      if (res.ok) {
        const data = await res.json()
        setConfigs(data.configs || [])
      }
    } catch (err) {
      console.error('Error fetching configs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Toggle active state
  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      // Optimistic update
      setConfigs((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isActive: !currentActive } : item))
      )

      const res = await fetch(`/api/configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })

      if (!res.ok) {
        // Revert on failure
        setConfigs((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isActive: currentActive } : item))
        )
        showToast('Không thể cập nhật trạng thái')
      } else {
        showToast(!currentActive ? 'Đã kích hoạt cấu hình' : 'Đã tạm tắt cấu hình')
      }
    } catch (err) {
      showToast('Có lỗi xảy ra')
      fetchConfigs()
    }
  }

  // Handle Edit
  const handleEdit = (item: ConfigItem) => {
    if (item.provider === 'LOTUS') {
      setSelectedLotus({
        id: item.id,
        accountName: item.accountName,
        botToken: item.botToken || '',
        chatId: item.chatId || '',
        isActive: item.isActive,
      })
      setLotusModalOpen(true)
    } else {
      setSelectedTiktok({
        id: item.id,
        accountName: item.accountName,
        cookie: item.cookie || '',
        csrfToken: item.csrfToken || '',
        referer: item.referer || 'https://ads.tiktok.com/',
        isActive: item.isActive,
      })
      setTiktokModalOpen(true)
    }
  }

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      const res = await fetch(`/api/configs/${itemToDelete.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('Đã xóa cấu hình thành công')
        fetchConfigs()
      } else {
        showToast('Không thể xóa cấu hình')
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi xóa')
    }
  }

  // Copy helper
  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedId(key)
    showToast('Đã sao chép vào bộ nhớ tạm')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Mask string for display
  const maskSecret = (secret: string | null | undefined, id: number) => {
    if (!secret) return '---'
    if (visibleSecrets[id]) return secret
    if (secret.length <= 8) return '••••••••'
    return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`
  }

  const toggleVisibility = (id: number) => {
    setVisibleSecrets((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filtering
  const filteredConfigs = configs.filter((item) => {
    const matchesProvider =
      filterProvider === 'ALL' || item.provider === filterProvider
    const matchesSearch =
      item.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.chatId && item.chatId.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesProvider && matchesSearch
  })

  const totalCount = configs.length
  const activeCount = configs.filter((c) => c.isActive).length
  const lotusCount = configs.filter((c) => c.provider === 'LOTUS').length
  const tiktokCount = configs.filter((c) => c.provider === 'TIKTOK').length

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-border bg-popover px-4 py-2.5 text-xs font-medium text-popover-foreground shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Cấu hình Upload
            </h1>
            <Badge variant="outline" className="text-xs">
              {totalCount} tài khoản
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý tài khoản phân phối Lotus CDN và TikTok Ads để tự động hóa quá trình tải lên video.
          </p>
        </div>

        {/* Modal Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Lotus Config */}
          <Button
            onClick={() => {
              setSelectedLotus(null)
              setLotusModalOpen(true)
            }}
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white shadow-xs"
          >
            <span>🌸</span>
            <span>Thêm cấu hình Lotus</span>
          </Button>

          {/* Add TikTok Config */}
          <Button
            onClick={() => {
              setSelectedTiktok(null)
              setTiktokModalOpen(true)
            }}
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs"
          >
            <span>🎵</span>
            <span>Thêm cấu hình TikTok</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tổng số cấu hình
            </CardTitle>
            <Sliders className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Đã lưu trữ trong hệ thống</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Đang kích hoạt
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Sẵn sàng nhận lệnh upload</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Lotus CDN Accounts
            </CardTitle>
            <span className="text-sm">🌸</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{lotusCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Bot Token & Chat ID</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              TikTok Ads Accounts
            </CardTitle>
            <span className="text-sm">🎵</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{tiktokCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Session Cookies</p>
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
            Tất cả ({totalCount})
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
            <span>Lotus ({lotusCount})</span>
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
            <span>TikTok ({tiktokCount})</span>
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên gợi nhớ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs bg-background"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchConfigs}
            disabled={isLoading}
            className="size-9 shrink-0"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Configs List / Grid */}
      {isLoading ? (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border/80 bg-card">
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span>Đang tải danh sách cấu hình...</span>
          </div>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3 text-2xl">
            ⚙️
          </div>
          <h3 className="text-base font-bold text-foreground">Chưa có cấu hình nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            {searchQuery
              ? `Không tìm thấy cấu hình nào khớp với từ khóa "${searchQuery}".`
              : 'Thêm tài khoản Lotus hoặc TikTok Ads để bắt đầu sử dụng chức năng tải lên video tự động.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedLotus(null)
                setLotusModalOpen(true)
              }}
              className="text-xs font-semibold gap-1.5 bg-pink-600 hover:bg-pink-700 text-white"
            >
              <span>🌸</span>
              <span>Thêm cấu hình Lotus</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTiktok(null)
                setTiktokModalOpen(true)
              }}
              className="text-xs font-semibold gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <span>🎵</span>
              <span>Thêm cấu hình TikTok</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredConfigs.map((item) => {
            const isLotus = item.provider === 'LOTUS'
            const isSecretVisible = Boolean(visibleSecrets[item.id])

            return (
              <Card
                key={item.id}
                className={`relative overflow-hidden border transition-all duration-200 hover:shadow-md ${
                  item.isActive
                    ? isLotus
                      ? 'border-pink-500/30 dark:border-pink-500/20 bg-card'
                      : 'border-cyan-500/30 dark:border-cyan-500/20 bg-card'
                    : 'border-border/60 opacity-75 bg-muted/20'
                }`}
              >
                {/* Header Card */}
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                          isLotus
                            ? 'bg-pink-500/15 text-pink-600 dark:text-pink-400'
                            : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                        }`}
                      >
                        {isLotus ? '🌸' : '🎵'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {item.accountName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant={isLotus ? 'secondary' : 'default'}
                            className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                              isLotus
                                ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'
                                : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                            }`}
                          >
                            {isLotus ? 'Lotus CDN' : 'TikTok Ads'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {item._count?.histories || 0} uploads
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item.id, item.isActive)}
                      title={item.isActive ? 'Bấm để tạm tắt' : 'Bấm để kích hoạt'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.isActive ? 'bg-emerald-500' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          item.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </CardHeader>

                {/* Card Content with Sensitive credentials */}
                <CardContent className="pt-3 pb-3 space-y-2.5 text-xs">
                  {isLotus ? (
                    <>
                      {/* Bot Token */}
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <Key className="size-3" />
                            <span>Bot Token:</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleVisibility(item.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title={isSecretVisible ? 'Ẩn token' : 'Hiện token'}
                            >
                              {isSecretVisible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                            </button>
                            {item.botToken && (
                              <button
                                onClick={() => copyToClipboard(`token-${item.id}`, item.botToken!)}
                                className="text-muted-foreground hover:text-foreground p-0.5"
                                title="Sao chép Token"
                              >
                                {copiedId === `token-${item.id}` ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="font-mono text-[11px] text-foreground truncate">
                          {maskSecret(item.botToken, item.id)}
                        </p>
                      </div>

                      {/* Chat ID */}
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span>Chat ID:</span>
                          {item.chatId && (
                            <button
                              onClick={() => copyToClipboard(`chat-${item.id}`, item.chatId!)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Sao chép Chat ID"
                            >
                              {copiedId === `chat-${item.id}` ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-foreground font-semibold truncate">
                          {item.chatId || '---'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* TikTok Cookie */}
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <CookieIcon className="size-3" />
                            <span>Cookie Session:</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleVisibility(item.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title={isSecretVisible ? 'Ẩn cookie' : 'Hiện cookie'}
                            >
                              {isSecretVisible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                            </button>
                            {item.cookie && (
                              <button
                                onClick={() => copyToClipboard(`cookie-${item.id}`, item.cookie!)}
                                className="text-muted-foreground hover:text-foreground p-0.5"
                                title="Sao chép Cookie"
                              >
                                {copiedId === `cookie-${item.id}` ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="font-mono text-[11px] text-foreground truncate">
                          {maskSecret(item.cookie, item.id)}
                        </p>
                      </div>

                      {/* Referer / CSRF */}
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2 text-[11px]">
                        <span className="text-muted-foreground">Referer:</span>
                        <span className="font-mono text-foreground truncate max-w-[180px]">
                          {item.referer || 'https://ads.tiktok.com/'}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>

                {/* Footer with Actions */}
                <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2.5">
                  <span className="text-[10px] text-muted-foreground">
                    Cập nhật: {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleEdit(item)}
                      title="Chỉnh sửa cấu hình"
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setItemToDelete(item)
                        setDeleteModalOpen(true)
                      }}
                      title="Xóa cấu hình"
                      className="size-7 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Lotus Modal */}
      <LotusModal
        open={lotusModalOpen}
        onClose={() => setLotusModalOpen(false)}
        onSuccess={() => {
          showToast(selectedLotus?.id ? 'Đã cập nhật cấu hình Lotus' : 'Đã tạo cấu hình Lotus mới')
          fetchConfigs()
        }}
        initialData={selectedLotus}
      />

      {/* TikTok Modal */}
      <TiktokModal
        open={tiktokModalOpen}
        onClose={() => setTiktokModalOpen(false)}
        onSuccess={() => {
          showToast(selectedTiktok?.id ? 'Đã cập nhật cấu hình TikTok' : 'Đã tạo cấu hình TikTok mới')
          fetchConfigs()
        }}
        initialData={selectedTiktok}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfigModal
        open={deleteModalOpen}
        accountName={itemToDelete?.accountName || ''}
        onClose={() => {
          setDeleteModalOpen(false)
          setItemToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
