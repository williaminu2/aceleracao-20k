import { NextRequest, NextResponse } from 'next/server'

// A proteção de rotas é feita no lado do cliente (AuthContext)
// O proxy apenas passa as requisições adiante
export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
