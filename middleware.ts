import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken, verifyRefreshToken, signAccessToken } from '@/lib/jwt'

const publicPaths = ['/auth/sign-in', '/auth/sign-up', '/403']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Cho phép các file tĩnh, favicon, api auth và các trang public đi qua
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth') ||
    publicPaths.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next()
  }

  let accessToken = request.cookies.get('accessToken')?.value
  const refreshToken = request.cookies.get('refreshToken')?.value

  let payload = accessToken ? await verifyAccessToken(accessToken) : null
  let newAccessToken: string | null = null

  // 2. Nếu Access Token hết hạn hoặc chưa có, nhưng có Refresh Token hợp lệ -> Tự động Renew ngay tại Middleware
  if (!payload && refreshToken) {
    const refreshPayload = await verifyRefreshToken(refreshToken)
    if (refreshPayload && refreshPayload.userId) {
      payload = refreshPayload
      newAccessToken = await signAccessToken({
        userId: refreshPayload.userId,
        email: refreshPayload.email,
        role: refreshPayload.role,
      })
    }
  }

  // 3. Nếu cả Access Token và Refresh Token đều không hợp lệ
  if (!payload || !payload.userId) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const signInUrl = new URL('/auth/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    signInUrl.searchParams.set('error', 'session_expired')
    return NextResponse.redirect(signInUrl)
  }

  // 4. Kiểm tra Role: Chỉ Admin mới được phép truy cập
  const roleName = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : ''
  const isAdmin = roleName === 'admin' || roleName === 'superadmin' || roleName === 'super_admin'

  if (!isAdmin) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Forbidden: Bạn không có quyền truy cập (Yêu cầu quyền Admin)' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/403', request.url))
  }

  // 5. Nếu có token mới được cấp, gắn cookie vào response và chuyển tiếp cho request
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId as string)
  if (roleName) requestHeaders.set('x-user-role', roleName)

  if (newAccessToken) {
    requestHeaders.set('cookie', `accessToken=${newAccessToken}; ${request.headers.get('cookie') || ''}`)
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15m
      path: '/',
    })
    return response
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
