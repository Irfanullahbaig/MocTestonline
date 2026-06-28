import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function getPublicTestUrl(testId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/test/${testId}`;
}

export function calculateMaxScore(
  questions: { marks: number }[]
): number {
  return questions.reduce((sum, q) => sum + q.marks, 0);
}

export function exportAttemptsToCsv(
  rows: {
    fullName: string;
    className: string;
    rollNumber: string;
    submittedAt: Date | null;
    totalScore: number;
    maxScore: number;
    status: string;
    tabSwitchCount: number;
  }[]
): string {
  const header =
    "Name,Class,Roll Number,Submitted At,Score,Max Score,Status,Tab Switches";
  const lines = rows.map((r) =>
    [
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.className.replace(/"/g, '""')}"`,
      `"${r.rollNumber.replace(/"/g, '""')}"`,
      r.submittedAt ? new Date(r.submittedAt).toISOString() : "",
      r.totalScore,
      r.maxScore,
      r.status,
      r.tabSwitchCount,
    ].join(",")
  );
  return [header, ...lines].join("\n");
}
