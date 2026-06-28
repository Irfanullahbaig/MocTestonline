"use client";

import { useState } from "react";
import { StudentAccessForm } from "@/components/student/access-form";
import { StudentTestLoader } from "@/components/student/test-runner";

export function StudentTestPage({
  testId,
  testTitle,
  expectedClass,
  instructions,
  questionCount,
  durationMinutes,
}: {
  testId: string;
  testTitle: string;
  expectedClass: string;
  instructions: string;
  questionCount: number;
  durationMinutes: number;
}) {
  const [session, setSession] = useState<{
    attemptId: string;
    sessionToken: string;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(`test-session-${testId}`);
    if (stored) {
      try {
        return JSON.parse(stored) as { attemptId: string; sessionToken: string };
      } catch {
        return null;
      }
    }
    return null;
  });

  function handleSuccess(data: { attemptId: string; sessionToken: string }) {
    sessionStorage.setItem(`test-session-${testId}`, JSON.stringify(data));
    setSession(data);
  }

  if (session) {
    return (
      <StudentTestLoader
        attemptId={session.attemptId}
        sessionToken={session.sessionToken}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-white">
        <h1 className="text-2xl font-bold">{testTitle}</h1>
        <p className="mt-2 text-slate-400">
          {questionCount} questions · {durationMinutes} minutes
        </p>
        {instructions && (
          <p className="mt-4 rounded-xl bg-slate-800 p-4 text-left text-sm text-slate-300">
            {instructions}
          </p>
        )}
      </div>
      <StudentAccessForm
        testId={testId}
        expectedClass={expectedClass}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
