import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'assetflow-secret-key-change-in-production'
);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/api')) {
    // Exclude public API routes
    if (
      request.nextUrl.pathname === '/api/auth/login' ||
      request.nextUrl.pathname === '/api/auth/signup'
    ) {
      return NextResponse.next();
    }

    if (!token) {
      if (request.nextUrl.pathname.startsWith('/api')) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (err) {
      if (request.nextUrl.pathname.startsWith('/api')) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
