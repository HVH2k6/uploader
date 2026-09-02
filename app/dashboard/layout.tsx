'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { AppHeader } from '@/components/dashboard/app-header'
import { CommandDialog } from '@/components/dashboard/command-dialog'

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar onOpenSearch={() => setSearchOpen(true)} />
      <SidebarInset>
        <AppHeader onOpenSearch={() => setSearchOpen(true)} />
        <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  )
}