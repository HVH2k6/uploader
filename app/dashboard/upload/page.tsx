import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getServerAuthSession } from '@/lib/auth-server'
import { UploadClient, type HistoryItem } from '@/components/dashboard/upload/upload-client'

export const dynamic = 'force-dynamic'

export default async function VideoUploadPage() {
  const session = await getServerAuthSession()

  if (!session || !session.userId) {
    redirect('/auth/sign-in')
  }

  // Fetch recent histories trực tiếp từ database ở Server Component
  const rawHistories = await prisma.historyUpload.findMany({
    where: {
      userId: session.userId,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      config: {
        select: {
          accountName: true,
          provider: true,
        },
      },
    },
  })

  // Serialize BigInt và Date sang Client Component Props
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

  return <UploadClient initialHistories={initialHistories} />
}
