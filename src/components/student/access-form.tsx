"use client";

import { useState } from "react";
import { startStudentAttempt } from "@/lib/actions/student";
import { Button, Input, Card } from "@/components/ui";

export function StudentAccessForm({
  testId,
  expectedClass,
  onSuccess,
}: {
  testId: string;
  expectedClass: string;
  onSuccess: (data: { attemptId: string; sessionToken: string }) => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const result = await startStudentAttempt(testId, {
      fullName: form.get("fullName") as string,
      className: form.get("className") as string,
      rollNumber: form.get("rollNumber") as string,
      email: (form.get("email") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      approvalPassword: form.get("approvalPassword") as string,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSuccess(result.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-900">Start Test</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your details and the approval password to begin.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input name="fullName" label="Full Name" required placeholder="Your full name" />
          <Input
            name="className"
            label="Class"
            required
            defaultValue={expectedClass}
            placeholder="Grade 10-A"
          />
          <Input
            name="rollNumber"
            label="Roll Number / Student ID"
            required
            placeholder="e.g. 101"
          />
          <Input
            name="email"
            label="Email (optional)"
            type="email"
            placeholder="student@email.com"
          />
          <Input name="phone" label="Phone (optional)" placeholder="+1 234 567 8900" />
          <Input
            name="approvalPassword"
            label="Approval Password"
            type="password"
            required
            placeholder="Provided by your teacher"
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Start Test"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
