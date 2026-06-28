import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const LOGIN_PATH = "/login";
const DASHBOARD_PATH = "/dashboard";

function isProtectedPath(pathname: string): boolean {
  return pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);
}

function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function redirectToDashboard(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = DASHBOARD_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

function logMiddlewareError(message: string, error?: unknown) {
  if (error instanceof Error) {
    console.error(`[middleware] ${message}:`, error.message);
    return;
  }

  console.error(`[middleware] ${message}`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const clientResult = createMiddlewareClient(request);

    if (!clientResult.ok) {
      logMiddlewareError(clientResult.error);

      if (isProtectedPath(pathname)) {
        return redirectToLogin(request);
      }

      return NextResponse.next();
    }

    const { supabase, response } = clientResult;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      logMiddlewareError("Supabase auth lookup failed", authError);

      if (isProtectedPath(pathname)) {
        return redirectToLogin(request);
      }

      return response;
    }

    if (isProtectedPath(pathname) && !user) {
      return redirectToLogin(request);
    }

    if (isLoginPath(pathname) && user) {
      return redirectToDashboard(request);
    }

    return response;
  } catch (error) {
    logMiddlewareError("Unhandled middleware error", error);

    if (isProtectedPath(pathname)) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Only run auth middleware on teacher routes.
     * Static assets, API routes, public test pages, and Next internals are excluded.
     */
    "/dashboard/:path*",
    "/login",
  ],
};
