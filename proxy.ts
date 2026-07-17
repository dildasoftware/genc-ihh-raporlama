import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = [
  '/panel',
  '/veri-girisi',
  '/kesif',
  '/karsilastir',
  '/il-karsilastir',
  '/trend',
  '/karne',
  '/haftalik-rapor',
  '/ai-analiz',
  '/arsiv',
  '/yonetim',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // NextAuth v4 session cookie — check existence (not validity)
  const sessionToken =
    request.cookies.get('next-auth.session-token') ??
    request.cookies.get('__Secure-next-auth.session-token')

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
