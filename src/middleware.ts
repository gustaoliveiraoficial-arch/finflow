import { NextResponse, type NextRequest } from 'next/server'

// Amigão 2.0 — app pessoal sem autenticação
// Apenas garante que rotas de auth antigas redirecionam para o dashboard
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox).*)'],
}
