import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getServerAuthSession } from '@/lib/auth-server'
import { HistoryClient, type HistoryItem } from '@/components/dashboard/history/history-client'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const session = await getServerAuthSession()

  if (!session || !session.userId) {
    redirect('/auth/sign-in')
  }

  // Fetch histories trực tiếp từ database ở Server Component
  const rawHistories = await prisma.historyUpload.findMany({
    where: {
      userId: session.userId,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      config: {
        select: {
          accountName: true,
          provider: true,
        },
      },
    },
  })

  // Định dạng lại BigInt và Date để serialize an toàn sang Client Component
  const initialHistories: HistoryItem[] = rawHistories.map((h) => ({
    id: h.id,
    originalFileName: h.originalFileName,
    fileSizeBytes: h.fileSizeBytes ? h.fileSizeBytes.toString() : null,
    durationSeconds: h.durationSeconds,
    providerUsed: h.providerUsed,
    status: h.status,
    m3u8Url: h.m3u8Url,
    createdAt: h.createdAt.toISOString(),
    config: h.config || undefined,
  }))

  return <HistoryClient initialHistories={initialHistories} />
}
