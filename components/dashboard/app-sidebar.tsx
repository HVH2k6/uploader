'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  UploadCloud,
  History,
  Users,
  Settings,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Sparkles,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

export interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
}

// Menu items configuration
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Upload',
    url: '/dashboard/upload',
    icon: UploadCloud,
    badge: 'Live',
    badgeVariant: 'success',
  },
  {
    title: 'Lịch sử upload',
    url: '/dashboard/history',
    icon: History,
  },
  {
    title: 'Người dùng',
    url: '/dashboard/users',
    icon: Users,
  },
  {
    title: 'Cấu hình',
    url: '/dashboard/settings',
    icon: Settings,
  },
]

interface AppSidebarProps {
  onOpenSearch?: () => void
}

export function AppSidebar({ onOpenSearch }: AppSidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  const userDisplayName = user?.username || user?.email?.split('@')[0] || 'Admin User'
  const userInitials = userDisplayName.substring(0, 2).toUpperCase()

  const isItemActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* Sidebar Header */}
      <SidebarHeader className="border-b border-sidebar-border/60 pb-3">
        <div className="flex items-center gap-2.5 px-1 py-0.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs font-bold text-base tracking-tight">
            🌸
          </div>
          <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-sidebar-foreground truncate">
                Lotus Cloud
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/30 text-primary">
                v2.0
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              HLS Video CDN Platform
            </span>
          </div>
        </div>

        {/* Quick Search trigger in Sidebar */}
        <div className="mt-2 group-data-[collapsible=icon]:hidden">
          <button
            onClick={onOpenSearch}
            className="flex h-8 w-full items-center justify-between rounded-lg border border-sidebar-border/80 bg-background/50 px-2.5 text-xs text-muted-foreground transition-all hover:bg-background hover:text-foreground hover:border-border"
          >
            <div className="flex items-center gap-2">
              <Search className="size-3.5 opacity-60" />
              <span>Tìm kiếm...</span>
            </div>
            <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border bg-muted/60 px-1 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu hệ thống</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isItemActive(item.url)
                return (
                  <SidebarMenuItem key={item.url}>
                    <Link href={item.url} className="block">
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.title}
                      >
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <SidebarMenuBadge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer with User Profile */}
      <SidebarFooter>
        <div className="relative">
          {/* User Menu Dropdown Popover */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 border-b border-border/60">
                <p className="text-xs font-semibold text-foreground truncate">{userDisplayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'admin@lotus.vn'}</p>
              </div>
              <div className="py-1 space-y-0.5">
                <Link
                  href="/dashboard/users"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <UserIcon className="size-3.5 text-muted-foreground" />
                  <span>Hồ sơ tài khoản</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>Cấu hình</span>
                </Link>
              </div>
              <div className="pt-1 border-t border-border/60">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="size-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}

          {/* User Card Trigger */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
          >
            <Avatar fallback={userInitials} className="size-8 rounded-lg text-xs" />
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-xs tracking-tight text-sidebar-foreground truncate">
                {userDisplayName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {user?.email || 'admin@lotus.vn'}
              </span>
            </div>
            <ChevronDown className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
