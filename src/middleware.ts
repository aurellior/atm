import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "atm_token";

/**
 * Validates JWT structure and checks `exp` claim in Edge Runtime
 */
function isTokenValidAndNotExpired(rawToken: string | null | undefined): boolean {
  if (!rawToken) return false;

  try {
    const decodedToken = decodeURIComponent(rawToken);
    const cleanToken = decodedToken.startsWith("Bearer ")
      ? decodedToken.slice(7).trim()
      : decodedToken.trim();

    if (!cleanToken) return false;

    const parts = cleanToken.split(".");
    if (parts.length !== 3) return false;

    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson);

    if (!payload || typeof payload !== "object") return false;

    // Check JWT expiration timestamp (in seconds)
    if (typeof payload.exp === "number") {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowInSeconds) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const headerToken = req.headers.get("authorization");
  const activeToken = headerToken || cookieToken;
  const hasValidSession = isTokenValidAndNotExpired(activeToken);

  // 1. Handle API routes
  if (pathname.startsWith("/api/")) {
    // Public auth endpoints (/api/auth/login, /api/auth/logout) & public holidays endpoint
    if (
      pathname.startsWith("/api/auth/login") ||
      pathname.startsWith("/api/auth/logout") ||
      pathname === "/api/v1/holidays"
    ) {
      return NextResponse.next();
    }

    // Protected API routes (/api/v1/* and /api/auth/me)
    if (!hasValidSession) {
      const res = NextResponse.json(
        {
          message: "Unauthorized: Sesi login tidak valid atau telah berakhir",
        },
        { status: 401 }
      );
      if (cookieToken) {
        res.cookies.delete(SESSION_COOKIE_NAME);
      }
      return res;
    }

    // Forward cookie token into Authorization header if header is not set
    if (!headerToken && cookieToken) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("authorization", cookieToken);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  }

  // 2. Handle Login page (/login)
  if (pathname === "/login") {
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const res = NextResponse.next();
    // Clear expired cookie if present
    if (cookieToken) {
      res.cookies.delete(SESSION_COOKIE_NAME);
    }
    return res;
  }

  // 3. Handle Protected pages (e.g. /, etc.)
  if (!hasValidSession) {
    const loginUrl = new URL("/login", req.url);
    const res = NextResponse.redirect(loginUrl);
    if (cookieToken) {
      res.cookies.delete(SESSION_COOKIE_NAME);
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
