"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatAuthError } from "@/lib/auth-errors";
import { calculateMaxScore } from "@/lib/utils";
import type { TestStatus, TimerMode } from "@prisma/client";

const testDetailsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  className: z.string().min(1, "Class name is required"),
  subject: z.string().min(1, "Subject is required"),
  instructions: z.string().optional(),
  totalDurationMinutes: z.coerce.number().min(1),
  approvalPassword: z.string().min(4, "Password must be at least 4 characters"),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type SignUpResult =
  | { success: true; needsEmailConfirmation: true; email: string }
  | { success: false; error: string };

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/dashboard";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false as const, error: formatAuthError(error.message) };
  }

  redirect(redirectTo);
}

export async function signUp(formData: FormData): Promise<SignUpResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { success: false, error: formatAuthError(error.message) };
  }

  if (data.user) {
    await prisma.teacher.upsert({
      where: { authId: data.user.id },
      create: {
        authId: data.user.id,
        email,
        name: name || email.split("@")[0],
      },
      update: { name: name || email.split("@")[0] },
    });
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    success: true,
    needsEmailConfirmation: true,
    email,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getDashboardTests() {
  const { teacher } = await requireTeacher();

  const tests = await prisma.test.findMany({
    where: { teacherId: teacher.id },
    include: {
      _count: { select: { attempts: { where: { status: { not: "IN_PROGRESS" } } } } },
      questions: { select: { marks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return tests.map((t) => ({
    id: t.id,
    title: t.title,
    className: t.className,
    subject: t.subject,
    status: t.status,
    published: t.published,
    attemptCount: t._count.attempts,
    questionCount: t.questions.length,
    maxScore: calculateMaxScore(t.questions),
    updatedAt: t.updatedAt,
  }));
}

export async function createTest(
  formData: FormData
): Promise<ActionResult<{ testId: string }>> {
  try {
    const { teacher } = await requireTeacher();
    const parsed = testDetailsSchema.safeParse({
      title: formData.get("title"),
      className: formData.get("className"),
      subject: formData.get("subject"),
      instructions: formData.get("instructions") ?? "",
      totalDurationMinutes: formData.get("totalDurationMinutes"),
      approvalPassword: formData.get("approvalPassword"),
      startAt: formData.get("startAt") || undefined,
      endAt: formData.get("endAt") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const hash = await hashPassword(parsed.data.approvalPassword);

    const test = await prisma.test.create({
      data: {
        teacherId: teacher.id,
        title: parsed.data.title,
        className: parsed.data.className,
        subject: parsed.data.subject,
        instructions: parsed.data.instructions ?? "",
        totalDurationMinutes: parsed.data.totalDurationMinutes,
        approvalPasswordHash: hash,
        startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
        endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: { testId: test.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create test" };
  }
}

export async function updateTestDetails(
  testId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const test = await prisma.test.findFirst({
      where: { id: testId, teacherId: teacher.id },
    });
    if (!test) return { success: false, error: "Test not found" };

    const parsed = testDetailsSchema.safeParse({
      title: formData.get("title"),
      className: formData.get("className"),
      subject: formData.get("subject"),
      instructions: formData.get("instructions") ?? "",
      totalDurationMinutes: formData.get("totalDurationMinutes"),
      approvalPassword: formData.get("approvalPassword"),
      startAt: formData.get("startAt") || undefined,
      endAt: formData.get("endAt") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const password = formData.get("approvalPassword") as string;
    const updateData: Record<string, unknown> = {
      title: parsed.data.title,
      className: parsed.data.className,
      subject: parsed.data.subject,
      instructions: parsed.data.instructions ?? "",
      totalDurationMinutes: parsed.data.totalDurationMinutes,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
    };

    if (password && password.length >= 4) {
      updateData.approvalPasswordHash = await hashPassword(password);
    }

    await prisma.test.update({ where: { id: testId }, data: updateData });
    revalidatePath(`/dashboard/tests/${testId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function updateTestSettings(
  testId: string,
  settings: {
    timerMode: TimerMode;
    defaultQuestionSeconds: number;
    allowSkip: boolean;
    allowReturnToSkipped: boolean;
    allowRetake: boolean;
    disableCopyPaste: boolean;
    requireFullscreen: boolean;
  }
): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const test = await prisma.test.findFirst({
      where: { id: testId, teacherId: teacher.id },
    });
    if (!test) return { success: false, error: "Test not found" };

    await prisma.test.update({
      where: { id: testId },
      data: settings,
    });

    revalidatePath(`/dashboard/tests/${testId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function publishTest(testId: string): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const test = await prisma.test.findFirst({
      where: { id: testId, teacherId: teacher.id },
      include: { questions: true },
    });
    if (!test) return { success: false, error: "Test not found" };
    if (test.questions.length === 0) {
      return { success: false, error: "Add at least one question before publishing" };
    }

    await prisma.test.update({
      where: { id: testId },
      data: { published: true, status: "ACTIVE" },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/tests/${testId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Publish failed" };
  }
}

export async function unpublishTest(testId: string): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const test = await prisma.test.findFirst({
      where: { id: testId, teacherId: teacher.id },
    });
    if (!test) return { success: false, error: "Test not found" };

    await prisma.test.update({
      where: { id: testId },
      data: { published: false, status: "DRAFT" },
    });

    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unpublish failed" };
  }
}

export async function updateTestStatus(
  testId: string,
  status: TestStatus
): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const test = await prisma.test.findFirst({
      where: { id: testId, teacherId: teacher.id },
    });
    if (!test) return { success: false, error: "Test not found" };

    await prisma.test.update({ where: { id: testId }, data: { status } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function deleteTest(testId: string): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const test = await prisma.test.findFirst({
      where: { id: testId, teacherId: teacher.id },
    });
    if (!test) return { success: false, error: "Test not found" };

    await prisma.test.delete({ where: { id: testId } });
    revalidatePath("/dashboard");
    redirect("/dashboard");
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function getTestForTeacher(testId: string) {
  const { teacher } = await requireTeacher();

  const test = await prisma.test.findFirst({
    where: { id: testId, teacherId: teacher.id },
    include: {
      questions: {
        include: { options: { orderBy: { orderIndex: "asc" } } },
        orderBy: { orderIndex: "asc" },
      },
      _count: { select: { attempts: true } },
    },
  });

  return test;
}

export async function getTestSubmissions(testId: string) {
  const { teacher } = await requireTeacher();

  const test = await prisma.test.findFirst({
    where: { id: testId, teacherId: teacher.id },
  });
  if (!test) return null;

  return prisma.studentAttempt.findMany({
    where: { testId, status: { not: "IN_PROGRESS" } },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getSubmissionDetail(testId: string, attemptId: string) {
  const { teacher } = await requireTeacher();

  const test = await prisma.test.findFirst({
    where: { id: testId, teacherId: teacher.id },
  });
  if (!test) return null;

  return prisma.studentAttempt.findFirst({
    where: { id: attemptId, testId },
    include: {
      answers: {
        include: {
          question: { include: { options: { orderBy: { orderIndex: "asc" } } } },
          feedback: true,
        },
        orderBy: { question: { orderIndex: "asc" } },
      },
    },
  });
}

export async function exportTestResults(testId: string): Promise<ActionResult<string>> {
  try {
    const { teacher } = await requireTeacher();
    const test = await prisma.test.findFirst({
      where: { id: testId, teacherId: teacher.id },
    });
    if (!test) return { success: false, error: "Test not found" };

    const attempts = await prisma.studentAttempt.findMany({
      where: { testId, status: { not: "IN_PROGRESS" } },
      orderBy: { submittedAt: "desc" },
    });

    const header =
      "Name,Class,Roll Number,Email,Phone,Submitted At,Score,Max Score,Status,Tab Switches";
    const lines = attempts.map((a) =>
      [
        `"${a.fullName.replace(/"/g, '""')}"`,
        `"${a.className.replace(/"/g, '""')}"`,
        `"${a.rollNumber.replace(/"/g, '""')}"`,
        a.email ?? "",
        a.phone ?? "",
        a.submittedAt ? new Date(a.submittedAt).toISOString() : "",
        a.totalScore,
        a.maxScore,
        a.status,
        a.tabSwitchCount,
      ].join(",")
    );

    return { success: true, data: [header, ...lines].join("\n") };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Export failed" };
  }
}

export async function verifyApprovalPassword(
  testId: string,
  password: string
): Promise<boolean> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { approvalPasswordHash: true, published: true },
  });
  if (!test?.published) return false;
  return verifyPassword(password, test.approvalPasswordHash);
}
