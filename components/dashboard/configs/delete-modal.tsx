'use client'

import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteModalProps {
  open: boolean
  accountName: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfigModal({ open, accountName, onClose, onConfirm }: DeleteModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  if (!open) return null

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
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

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-150 text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Xác nhận xóa cấu hình</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bạn có chắc chắn muốn xóa cấu hình <strong className="text-foreground">&ldquo;{accountName}&rdquo;</strong>? Hành động này không thể hoàn tác.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="w-full h-8 text-xs font-medium"
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="w-full h-8 text-xs font-semibold gap-1.5"
          >
            {isLoading && <Loader2 className="size-3 animate-spin" />}
            <span>Xác nhận xóa</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
