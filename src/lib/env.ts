type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

type EnvResult =
  | { ok: true; env: SupabasePublicEnv }
  | { ok: false; error: string };

function readNonEmpty(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getSupabasePublicEnv(): EnvResult {
  const url =
    readNonEmpty("NEXT_PUBLIC_SUPABASE_URL") ?? readNonEmpty("SUPABASE_URL");
  const anonKey = readNonEmpty("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const missing: string[] = [];
  if (!url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!anonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required environment variable(s): ${missing.join(", ")}. Configure them in Vercel Project Settings → Environment Variables.`,
    };
  }

  try {
    new URL(url!);
  } catch {
    return {
      ok: false,
      error: `Invalid NEXT_PUBLIC_SUPABASE_URL: "${url}". Expected a full URL such as https://your-project.supabase.co`,
    };
  }

  return {
    ok: true,
    env: {
      url: url!,
      anonKey: anonKey!,
    },
  };
}

export function requireSupabasePublicEnv(context: string): SupabasePublicEnv {
  const result = getSupabasePublicEnv();
  if (!result.ok) {
    throw new Error(`[${context}] ${result.error}`);
  }
  return result.env;
}
