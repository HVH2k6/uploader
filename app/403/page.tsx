'use client'

import * as React from 'react'
import Link from 'next/link'
import { ShieldAlert, LogOut, ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function ForbiddenPage() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center space-y-6">
        {/* Icon with alert badge */}
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-lg ring-8 ring-destructive/5">
          <ShieldAlert className="size-10" />
          <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
            !
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            <Lock className="size-3" />
            <span>HTTP 403 Forbidden</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Không có quyền truy cập
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Khu vực này chỉ dành riêng cho tài khoản có quyền <strong className="text-foreground">Quản trị viên (Admin)</strong>. Tài khoản hiện tại của bạn không được cấp quyền để truy cập trang này.
          </p>
        </div>

        {/* Current user card if logged in */}
        {user && (
          <div className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-xs space-y-1.5">
            <p className="text-xs text-muted-foreground">Tài khoản đang đăng nhập:</p>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground truncate">
                {user.email}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                Role: {user.role?.name || 'User'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => logout()}
            className="w-full sm:w-auto gap-2 text-xs font-medium"
          >
            <LogOut className="size-3.5" />
            <span>Đăng xuất</span>
          </Button>

          <Link href="/auth/sign-in" className="w-full sm:w-auto">
            <Button className="w-full gap-2 text-xs font-semibold bg-primary text-primary-foreground">
              <ArrowLeft className="size-3.5" />
              <span>Đăng nhập tài khoản khác</span>
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground pt-4">
          Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ Super Administrator để được cấp quyền.
        </p>
      </div>
    </div>
  )
}
