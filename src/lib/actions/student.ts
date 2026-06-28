"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { calculateMaxScore } from "@/lib/utils";
import type { ActionResult } from "./teacher";

const accessSchema = z.object({
  fullName: z.string().min(1),
  className: z.string().min(1),
  rollNumber: z.string().min(1),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  approvalPassword: z.string().min(1),
});

export async function getPublicTest(testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      title: true,
      className: true,
      subject: true,
      instructions: true,
      totalDurationMinutes: true,
      startAt: true,
      endAt: true,
      published: true,
      status: true,
      allowSkip: true,
      allowReturnToSkipped: true,
      disableCopyPaste: true,
      requireFullscreen: true,
      timerMode: true,
      defaultQuestionSeconds: true,
      _count: { select: { questions: true } },
    },
  });

  if (!test?.published) return null;

  const now = new Date();
  if (test.startAt && now < test.startAt) {
    return { ...test, notYetOpen: true as const };
  }
  if (test.endAt && now > test.endAt) {
    return { ...test, closed: true as const };
  }

  return { ...test, notYetOpen: false as const, closed: false as const };
}

export async function startStudentAttempt(
  testId: string,
  data: z.infer<typeof accessSchema>
): Promise<ActionResult<{ attemptId: string; sessionToken: string }>> {
  try {
    const parsed = accessSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { questions: { select: { marks: true } } },
    });

    if (!test?.published) {
      return { success: false, error: "This test is not available" };
    }

    const now = new Date();
    if (test.startAt && now < test.startAt) {
      return { success: false, error: "Test has not started yet" };
    }
    if (test.endAt && now > test.endAt) {
      return { success: false, error: "Test has ended" };
    }

    const valid = await verifyPassword(
      parsed.data.approvalPassword,
      test.approvalPasswordHash
    );
    if (!valid) {
      return { success: false, error: "Incorrect approval password" };
    }

    const existing = await prisma.studentAttempt.findUnique({
      where: {
        testId_rollNumber: { testId, rollNumber: parsed.data.rollNumber },
      },
    });

    if (existing) {
      if (existing.status === "IN_PROGRESS") {
        return {
          success: true,
          data: { attemptId: existing.id, sessionToken: existing.sessionToken },
        };
      }
      if (!test.allowRetake) {
        return {
          success: false,
          error: "You have already submitted this test. Retakes are not allowed.",
        };
      }
    }

    const maxScore = calculateMaxScore(test.questions);

    if (existing && test.allowRetake) {
      await prisma.studentAnswer.deleteMany({ where: { attemptId: existing.id } });
      const updated = await prisma.studentAttempt.update({
        where: { id: existing.id },
        data: {
          fullName: parsed.data.fullName,
          className: parsed.data.className,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          submittedAt: null,
          totalScore: 0,
          maxScore,
          tabSwitchCount: 0,
          sessionToken: crypto.randomUUID(),
        },
      });
      return {
        success: true,
        data: { attemptId: updated.id, sessionToken: updated.sessionToken },
      };
    }

    const attempt = await prisma.studentAttempt.create({
      data: {
        testId,
        fullName: parsed.data.fullName,
        className: parsed.data.className,
        rollNumber: parsed.data.rollNumber,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        maxScore,
      },
    });

    return {
      success: true,
      data: { attemptId: attempt.id, sessionToken: attempt.sessionToken },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to start test",
    };
  }
}

export async function getAttemptForStudent(
  attemptId: string,
  sessionToken: string
) {
  const attempt = await prisma.studentAttempt.findFirst({
    where: { id: attemptId, sessionToken },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          totalDurationMinutes: true,
          allowSkip: true,
          allowReturnToSkipped: true,
          disableCopyPaste: true,
          requireFullscreen: true,
          timerMode: true,
          defaultQuestionSeconds: true,
        },
      },
      answers: true,
    },
  });

  if (!attempt || attempt.status !== "IN_PROGRESS") return null;

  const questions = await prisma.question.findMany({
    where: { testId: attempt.testId },
    include: { options: { orderBy: { orderIndex: "asc" } } },
    orderBy: { orderIndex: "asc" },
  });

  const publicQuestions = questions.map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    imageUrl: q.imageUrl,
    marks: q.marks,
    orderIndex: q.orderIndex,
    timerSeconds:
      q.timerSeconds ??
      (attempt.test.timerMode === "SAME_FOR_ALL"
        ? attempt.test.defaultQuestionSeconds
        : 60),
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));

  return { attempt, questions: publicQuestions };
}

export async function saveAnswer(
  attemptId: string,
  sessionToken: string,
  questionId: string,
  data: {
    selectedOptionId?: string | null;
    textAnswer?: string | null;
    isSkipped?: boolean;
  }
): Promise<ActionResult> {
  try {
    const attempt = await prisma.studentAttempt.findFirst({
      where: { id: attemptId, sessionToken, status: "IN_PROGRESS" },
    });
    if (!attempt) return { success: false, error: "Invalid session" };

    await prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: { attemptId, questionId },
      },
      create: {
        attemptId,
        questionId,
        selectedOptionId: data.selectedOptionId ?? null,
        textAnswer: data.textAnswer ?? null,
        isSkipped: data.isSkipped ?? false,
        gradingStatus: "PENDING",
      },
      update: {
        selectedOptionId: data.selectedOptionId ?? null,
        textAnswer: data.textAnswer ?? null,
        isSkipped: data.isSkipped ?? false,
      },
    });

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function recordTabSwitch(
  attemptId: string,
  sessionToken: string
): Promise<ActionResult> {
  try {
    const attempt = await prisma.studentAttempt.findFirst({
      where: { id: attemptId, sessionToken, status: "IN_PROGRESS" },
    });
    if (!attempt) return { success: false, error: "Invalid session" };

    await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: { tabSwitchCount: { increment: 1 } },
    });

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

async function autoGradeAttempt(attemptId: string) {
  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: {
        include: {
          question: { include: { options: true } },
        },
      },
    },
  });
  if (!attempt) return;

  let totalScore = 0;

  for (const answer of attempt.answers) {
    const q = answer.question;
    if (q.type === "MCQ") {
      const correct = q.options.find((o) => o.isCorrect);
      const isCorrect =
        correct && answer.selectedOptionId === correct.id && !answer.isSkipped;
      const marks = isCorrect ? q.marks : 0;
      await prisma.studentAnswer.update({
        where: { id: answer.id },
        data: {
          marksAwarded: marks,
          gradingStatus: "AUTO_GRADED",
        },
      });
      totalScore += marks;
    } else if (!answer.isSkipped && answer.textAnswer?.trim()) {
      await prisma.studentAnswer.update({
        where: { id: answer.id },
        data: { gradingStatus: "PENDING", marksAwarded: null },
      });
    } else {
      await prisma.studentAnswer.update({
        where: { id: answer.id },
        data: { marksAwarded: 0, gradingStatus: "AUTO_GRADED" },
      });
    }
  }

  const pending = await prisma.studentAnswer.count({
    where: { attemptId, gradingStatus: "PENDING" },
  });

  await prisma.studentAttempt.update({
    where: { id: attemptId },
    data: {
      totalScore,
      status: pending > 0 ? "SUBMITTED" : "GRADED",
      submittedAt: new Date(),
    },
  });
}

export async function submitAttempt(
  attemptId: string,
  sessionToken: string
): Promise<ActionResult<{ totalScore: number; maxScore: number }>> {
  try {
    const attempt = await prisma.studentAttempt.findFirst({
      where: { id: attemptId, sessionToken, status: "IN_PROGRESS" },
    });
    if (!attempt) return { success: false, error: "Invalid session or already submitted" };

    const questions = await prisma.question.findMany({
      where: { testId: attempt.testId },
      select: { id: true },
    });

    for (const q of questions) {
      const existing = await prisma.studentAnswer.findUnique({
        where: { attemptId_questionId: { attemptId, questionId: q.id } },
      });
      if (!existing) {
        await prisma.studentAnswer.create({
          data: {
            attemptId,
            questionId: q.id,
            isSkipped: true,
            gradingStatus: "AUTO_GRADED",
            marksAwarded: 0,
          },
        });
      }
    }

    await autoGradeAttempt(attemptId);

    const updated = await prisma.studentAttempt.findUnique({
      where: { id: attemptId },
    });

    return {
      success: true,
      data: {
        totalScore: updated?.totalScore ?? 0,
        maxScore: updated?.maxScore ?? 0,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Submit failed" };
  }
}

export async function gradeAnswer(
  answerId: string,
  marksAwarded: number,
  feedback: string
): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();

    const answer = await prisma.studentAnswer.findFirst({
      where: { id: answerId },
      include: {
        attempt: { include: { test: true } },
        question: true,
      },
    });

    if (!answer || answer.attempt.test.teacherId !== teacher.id) {
      return { success: false, error: "Answer not found" };
    }

    if (marksAwarded < 0 || marksAwarded > answer.question.marks) {
      return {
        success: false,
        error: `Marks must be between 0 and ${answer.question.marks}`,
      };
    }

    await prisma.studentAnswer.update({
      where: { id: answerId },
      data: {
        marksAwarded,
        gradingStatus: "MANUALLY_GRADED",
      },
    });

    await prisma.gradingFeedback.upsert({
      where: { answerId },
      create: {
        answerId,
        feedback,
        gradedBy: teacher.id,
      },
      update: { feedback, gradedBy: teacher.id, gradedAt: new Date() },
    });

    const attemptId = answer.attemptId;
    const allAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId },
    });

    const totalScore = allAnswers.reduce(
      (sum, a) => sum + (a.marksAwarded ?? 0),
      0
    );
    const allGraded = allAnswers.every(
      (a) => a.gradingStatus !== "PENDING"
    );

    await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: {
        totalScore,
        status: allGraded ? "GRADED" : "SUBMITTED",
      },
    });

    revalidatePath(
      `/dashboard/tests/${answer.attempt.testId}/submissions/${attemptId}`
    );
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Grading failed" };
  }
}
