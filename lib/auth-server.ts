import { cookies } from 'next/headers'
import { verifyAccessToken, verifyRefreshToken } from '@/lib/jwt'

export interface AuthSession {
  userId: string
  email?: string
  role?: string
}

export async function getServerAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const refreshToken = cookieStore.get('refreshToken')?.value

  if (accessToken) {
    const payload = await verifyAccessToken(accessToken)
    if (payload && payload.userId) {
      return {
        userId: payload.userId as string,
        email: payload.email as string | undefined,
        role: payload.role as string | undefined,
      }
    }
  }

  // Fallback sang Refresh Token nếu Access Token vừa hết hạn
  if (refreshToken) {
    const refreshPayload = await verifyRefreshToken(refreshToken)
    if (refreshPayload && refreshPayload.userId) {
      return {
        userId: refreshPayload.userId as string,
        email: refreshPayload.email as string | undefined,
        role: refreshPayload.role as string | undefined,
      }
    }
  }

  return null
}
