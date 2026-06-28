import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env";

type MiddlewareSupabaseResult =
  | {
      ok: true;
      supabase: ReturnType<typeof createServerClient>;
      response: NextResponse;
    }
  | { ok: false; error: string };

export function createMiddlewareClient(
  request: NextRequest
): MiddlewareSupabaseResult {
  const envResult = getSupabasePublicEnv();
  if (!envResult.ok) {
    return { ok: false, error: envResult.error };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    envResult.env.url,
    envResult.env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { ok: true, supabase, response };
}
