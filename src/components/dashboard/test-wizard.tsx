"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTest } from "@/lib/actions/teacher";
import { Button, Input, Textarea, Card } from "@/components/ui";

const STEPS = ["Test Details", "Add Questions", "Settings", "Publish"];

export function TestWizard({ testId: initialTestId }: { testId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await createTest(formData);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/dashboard/tests/${result.data.testId}?tab=questions`);
  }

  if (initialTestId) {
    router.push(`/dashboard/tests/${initialTestId}`);
    return null;
  }

  const step = 0;

  return (
    <div>
      <div className="mb-8 flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium sm:text-sm ${
              i === step
                ? "bg-indigo-600 text-white"
                : i < step
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className="hidden sm:inline">{i + 1}. </span>
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <h2 className="text-lg font-semibold">Test Details</h2>
          <p className="mt-1 text-sm text-slate-600">
            Basic information about your test
          </p>
          <form onSubmit={handleCreateDetails} className="mt-6 space-y-4">
            <Input name="title" label="Test Title" required placeholder="Mid-term Exam" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="className" label="Class Name" required placeholder="Grade 10-A" />
              <Input name="subject" label="Subject" required placeholder="Mathematics" />
            </div>
            <Textarea
              name="instructions"
              label="Instructions"
              rows={4}
              placeholder="Read all questions carefully..."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="totalDurationMinutes"
                label="Total Duration (minutes)"
                type="number"
                min={1}
                defaultValue={60}
                required
              />
              <Input
                name="approvalPassword"
                label="Approval Password"
                type="password"
                required
                minLength={4}
                placeholder="Students need this to start"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="startAt"
                label="Start Date/Time (optional)"
                type="datetime-local"
              />
              <Input
                name="endAt"
                label="End Date/Time (optional)"
                type="datetime-local"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Continue to Questions"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
