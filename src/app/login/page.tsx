"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/actions/teacher";
import { Button, Input, Card } from "@/components/ui";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("redirect", redirect);

    const result =
      mode === "login"
        ? await signIn(formData)
        : await signUp(formData);

    if (result && !result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 text-center">
        <Link href="/" className="text-2xl font-bold text-indigo-600">
          MocTest
        </Link>
        <p className="mt-2 text-sm text-slate-600">
          {mode === "login"
            ? "Sign in to manage your tests"
            : "Create a teacher account"}
        </p>
      </div>

      <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {m === "login" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <Input name="name" label="Full name" required placeholder="Jane Smith" />
        )}
        <Input
          name="email"
          type="email"
          label="Email"
          required
          placeholder="teacher@school.edu"
        />
        <Input
          name="password"
          type="password"
          label="Password"
          required
          minLength={6}
          placeholder="••••••••"
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 px-4">
      <Suspense fallback={<div className="text-slate-600">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
