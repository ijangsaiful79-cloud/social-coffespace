import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cek session dari cookie Supabase (tanpa query DB)
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  const protectedUserRoutes = ['/people', '/chat', '/profile']
  if (protectedUserRoutes.some(r => pathname.startsWith(r)) && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/people/:path*',
    '/chat/:path*',
    '/profile/:path*',
  ],
}
