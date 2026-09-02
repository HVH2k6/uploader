import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getServerAuthSession } from '@/lib/auth-server'
import { ConfigsClient, type ConfigItem } from '@/components/dashboard/configs/configs-client'

export const dynamic = 'force-dynamic'

export default async function ConfigUploadPage() {
  const session = await getServerAuthSession()

  if (!session || !session.userId) {
    redirect('/auth/sign-in')
  }

  // Fetch configs trực tiếp từ database ở Server Component
  const rawConfigs = await prisma.configUpload.findMany({
    where: {
      userId: session.userId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { histories: true },
      },
    },
  })

  // Định dạng lại các trường kiểu Date/BigInt để truyền an toàn qua Client Component Props
  const initialConfigs: ConfigItem[] = rawConfigs.map((c) => ({
    id: c.id,
    userId: c.userId,
    provider: c.provider as 'LOTUS' | 'TIKTOK',
    accountName: c.accountName,
    botToken: c.botToken,
    chatId: c.chatId,
    cookie: c.cookie,
    csrfToken: c.csrfToken,
    referer: c.referer,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    _count: {
      histories: c._count.histories,
    },
  }))

  return <ConfigsClient initialConfigs={initialConfigs} />
}
