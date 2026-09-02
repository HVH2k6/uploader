'use client'

import * as React from 'react'
import {
  Bell,
  Search,
  UploadCloud,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/dashboard/theme-toggle'
import { useAuth } from '@/contexts/AuthContext'

interface AppHeaderProps {
  onOpenSearch?: () => void
}

export function AppHeader({ onOpenSearch }: AppHeaderProps) {
  const { user, logout } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false)

  const userDisplayName = user?.username || user?.email?.split('@')[0] || 'Admin User'
  const userInitials = userDisplayName.substring(0, 2).toUpperCase()

  const notifications = [
    {
      id: 1,
      title: 'HLS Transcoding Complete',
      desc: 'video_sample_1080p.mp4 is ready on BunnyCDN',
      time: '2 mins ago',
      type: 'success',
    },
    {
      id: 2,
      title: 'Storage Node Synced',
      desc: 'S3 primary bucket synced 42.8 GB of media',
      time: '1 hour ago',
      type: 'info',
    },
    {
      id: 3,
      title: 'New API Key Created',
      desc: 'Production read-write key generated',
      time: '3 hours ago',
      type: 'warning',
    },
  ]

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md transition-[width,height] ease-linear">
      {/* Left side: Trigger, Separator, Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Lotus Cloud
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground">
                Classic Overview
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right side: Search, Actions, Notifications, Theme, User */}
      <div className="flex items-center gap-2">
        {/* Global Search Bar trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden md:flex h-8 w-56 lg:w-64 items-center justify-between rounded-lg border border-input bg-muted/40 px-2.5 text-xs text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 opacity-60" />
            <span>Search anything...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border bg-background px-1 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSearch}
          className="md:hidden size-8 text-muted-foreground hover:text-foreground"
          title="Search"
        >
          <Search className="size-4" />
        </Button>

        {/* Quick Upload Action Button */}
        <Button
          size="sm"
          className="hidden sm:inline-flex h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs text-xs font-semibold px-3"
          onClick={onOpenSearch}
        >
          <UploadCloud className="size-3.5" />
          <span>Upload Media</span>
        </Button>

        {/* Notification Bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative size-8 text-muted-foreground hover:text-foreground hover:bg-accent/60"
            title="Notifications"
          >
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </Button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 z-50 rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-xs text-foreground">Notifications</h4>
                  <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">
                    3 New
                  </Badge>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Mark all read
                </button>
              </div>

              <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                {notifications.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-muted/40 transition-colors flex gap-2.5 items-start">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-xs font-medium text-foreground leading-tight">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{item.desc}</p>
                      <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 pt-1">
                        <Clock className="size-2.5" /> {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-2 text-center">
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-full text-center text-xs font-medium text-primary hover:underline py-1"
                >
                  View all system logs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark/Light Theme Switcher */}
        <ThemeToggle />

        {/* Separator */}
        <Separator orientation="vertical" className="mx-0.5 h-4" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 rounded-full p-0.5 ring-offset-background transition-all hover:ring-2 hover:ring-ring/50 focus:outline-none"
          >
            <Avatar fallback={userInitials} className="size-7 text-xs font-bold" />
          </button>

          {/* User Dropdown Popover */}
          {userDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 z-50 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-border/60">
                <p className="text-xs font-semibold text-foreground truncate">{userDisplayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'admin@lotus.vn'}</p>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <UserIcon className="size-3.5 text-muted-foreground" />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>System Preferences</span>
                </button>
              </div>

              <div className="pt-1 border-t border-border/60">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
