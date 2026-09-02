'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutDashboard,
  UploadCloud,
  History,
  Users,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react'

interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  name: string
  icon: LucideIcon
  href: string
  category: string
}

export function CommandDialog({ open, onOpenChange }: CommandDialogProps) {
  const [query, setQuery] = React.useState('')
  const router = useRouter()

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  const items: CommandItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', category: 'Tổng quan' },
    { name: 'Upload', icon: UploadCloud, href: '/dashboard/upload', category: 'Tải lên & Mã hóa' },
    { name: 'Lịch sử upload', icon: History, href: '/dashboard/history', category: 'Lịch sử tệp tin' },
    { name: 'Người dùng', icon: Users, href: '/dashboard/users', category: 'Quản lý tài khoản' },
    { name: 'Cấu hình', icon: Settings, href: '/dashboard/settings', category: 'Hệ thống & Cài đặt' },
  ]

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (href: string) => {
    onOpenChange(false)
    setQuery('')
    router.push(href)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog box */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Search header */}
        <div className="flex items-center border-b border-border px-3.5 py-2.5">
          <Search className="mr-2.5 size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search pages..."
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground mr-1"
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 scrollbar-none">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Actions & Pages
              </div>
              {filteredItems.map((item, idx) => {
                const Icon = item.icon
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item.href)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                  >
                    <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-[11px] text-muted-foreground">{item.category}</span>
                    </div>
                    <kbd className="text-[10px] text-muted-foreground opacity-60">↵</kbd>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span>Navigate with arrows, select with Enter</span>
          <span>Lotus Cloud Dashboard</span>
        </div>
      </div>
    </div>
  )
}
