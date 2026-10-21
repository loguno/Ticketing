import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'supersecretjwttokenkey123!'
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login, public API authentication, next.js internals, and home page
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith('/api/');
  const configuredApiKey = process.env.TICKETS_API_KEY;

  // 1. Check Service API Key (for external systems, Telegram bot, AI assistant)
  const apiKeyHeader = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const providedKey = apiKeyHeader || bearerToken;

  if (configuredApiKey && providedKey && providedKey === configuredApiKey) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', 'api-service');
    requestHeaders.set('x-user-role', 'ADMIN');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Check JWT Session Cookie
  const token = request.cookies.get('token')?.value;

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Non autorizzato: token di sessione mancante o API Key non valida.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Decode and verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    // RBAC: Admin-only routes
    if (pathname.startsWith('/dashboard/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Inject user identity headers for API routes or server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);
    requestHeaders.set('x-user-role', userRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Non autorizzato: token di sessione non valido o scaduto.' },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
