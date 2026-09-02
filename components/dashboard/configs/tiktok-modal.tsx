'use client'

import * as React from 'react'
import { X, Loader2, Cookie, Shield, Globe, Tag, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface TiktokConfigData {
  id?: number
  accountName: string
  cookie: string
  csrfToken?: string | null
  referer?: string
  isActive: boolean
}

interface TiktokModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: TiktokConfigData | null
}

export function TiktokModal({ open, onClose, onSuccess, initialData }: TiktokModalProps) {
  const [accountName, setAccountName] = React.useState('')
  const [cookie, setCookie] = React.useState('')
  const [csrfToken, setCsrfToken] = React.useState('')
  const [referer, setReferer] = React.useState('https://ads.tiktok.com/')
  const [isActive, setIsActive] = React.useState(true)

  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isEditing = Boolean(initialData?.id)

  React.useEffect(() => {
    if (initialData) {
      setAccountName(initialData.accountName || '')
      setCookie(initialData.cookie || '')
      setCsrfToken(initialData.csrfToken || '')
      setReferer(initialData.referer || 'https://ads.tiktok.com/')
      setIsActive(initialData.isActive ?? true)
    } else {
      setAccountName('')
      setCookie('')
      setCsrfToken('')
      setReferer('https://ads.tiktok.com/')
      setIsActive(true)
    }
    setError(null)
  }, [initialData, open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const url = isEditing ? `/api/configs/${initialData?.id}` : '/api/configs'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'TIKTOK',
          accountName: accountName.trim(),
          cookie: cookie.trim(),
          csrfToken: csrfToken.trim() || null,
          referer: referer.trim() || 'https://ads.tiktok.com/',
          isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi lưu cấu hình')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold text-lg">
              🎵
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isEditing ? 'Chỉnh sửa cấu hình TikTok' : 'Thêm cấu hình TikTok Ads'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Cấu hình Cookie & CSRF Token để tự động upload lên TikTok
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Account Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ttAccountName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="size-3.5 text-muted-foreground" />
              <span>Tên gợi nhớ tài khoản *</span>
            </Label>
            <Input
              id="ttAccountName"
              placeholder="VD: TikTok Ads Account #01"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              disabled={isLoading}
              className="h-9 text-xs"
            />
          </div>

          {/* Cookie */}
          <div className="space-y-1.5">
            <Label htmlFor="ttCookie" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Cookie className="size-3.5 text-muted-foreground" />
              <span>Cookie Session *</span>
            </Label>
            <textarea
              id="ttCookie"
              rows={3}
              placeholder="Dán toàn bộ chuỗi Cookie TikTok Ads vào đây (VD: sessionid=...; csrf_token=...)"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* CSRF Token & Referer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ttCsrfToken" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="size-3.5 text-muted-foreground" />
                <span>CSRF Token (tùy chọn)</span>
              </Label>
              <Input
                id="ttCsrfToken"
                placeholder="VD: csrf_token_value"
                value={csrfToken}
                onChange={(e) => setCsrfToken(e.target.value)}
                disabled={isLoading}
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ttReferer" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                <span>Referer URL</span>
              </Label>
              <Input
                id="ttReferer"
                placeholder="https://ads.tiktok.com/"
                value={referer}
                onChange={(e) => setReferer(e.target.value)}
                disabled={isLoading}
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          {/* Is Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">Trạng thái kích hoạt</span>
              <p className="text-[11px] text-muted-foreground">
                Cho phép hệ thống sử dụng tài khoản TikTok này khi upload
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="h-8 text-xs font-medium"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs gap-1.5"
            >
              {isLoading && <Loader2 className="size-3 animate-spin" />}
              <span>{isEditing ? 'Lưu thay đổi' : 'Tạo cấu hình'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
