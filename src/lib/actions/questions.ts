"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteQuestionImage,
  uploadQuestionImage,
} from "@/lib/supabase/storage";
import type { QuestionType } from "@prisma/client";
import type { ActionResult } from "./teacher";

const mcqSchema = z.object({
  text: z.string().min(1),
  marks: z.coerce.number().min(1),
  explanation: z.string().optional(),
  timerSeconds: z.coerce.number().optional(),
  options: z.array(
    z.object({
      text: z.string().min(1),
      isCorrect: z.boolean(),
    })
  ).min(2),
});

const textQuestionSchema = z.object({
  text: z.string().min(1),
  marks: z.coerce.number().min(1),
  shortAnswer: z.string().optional(),
  timerSeconds: z.coerce.number().optional(),
});

async function assertTestOwnership(testId: string, teacherId: string) {
  return prisma.test.findFirst({ where: { id: testId, teacherId } });
}

export async function addQuestion(
  testId: string,
  type: QuestionType,
  formData: FormData
): Promise<ActionResult<{ questionId: string }>> {
  try {
    const { teacher } = await requireTeacher();
    const test = await assertTestOwnership(testId, teacher.id);
    if (!test) return { success: false, error: "Test not found" };

    const count = await prisma.question.count({ where: { testId } });
    const image = formData.get("image") as File | null;
    const hasImage = image && image.size > 0;

    if (type === "MCQ") {
      const optionsJson = formData.get("options") as string;
      const options = JSON.parse(optionsJson) as { text: string; isCorrect: boolean }[];
      const parsed = mcqSchema.safeParse({
        text: formData.get("text"),
        marks: formData.get("marks"),
        explanation: formData.get("explanation") ?? "",
        timerSeconds: formData.get("timerSeconds") || undefined,
        options,
      });
      if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid MCQ" };
      }
      if (!options.some((o) => o.isCorrect)) {
        return { success: false, error: "Select a correct answer" };
      }

      const question = await prisma.question.create({
        data: {
          testId,
          type: "MCQ",
          text: parsed.data.text,
          marks: parsed.data.marks,
          explanation: parsed.data.explanation,
          timerSeconds: parsed.data.timerSeconds ?? null,
          orderIndex: count,
        },
      });

      await prisma.questionOption.createMany({
        data: parsed.data.options.map((o, i) => ({
          questionId: question.id,
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: i,
        })),
      });

      if (hasImage) {
        const imageUrl = await uploadQuestionImage(image, testId, question.id);
        await prisma.question.update({
          where: { id: question.id },
          data: { imageUrl },
        });
      }

      revalidatePath(`/dashboard/tests/${testId}`);
      return { success: true, data: { questionId: question.id } };
    }

    const parsed = textQuestionSchema.safeParse({
      text: formData.get("text"),
      marks: formData.get("marks"),
      shortAnswer: formData.get("shortAnswer") ?? "",
      timerSeconds: formData.get("timerSeconds") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid question" };
    }

    const questionData = {
      testId,
      type,
      text: parsed.data.text,
      marks: parsed.data.marks,
      orderIndex: count,
      shortAnswer: type === "SHORT" ? parsed.data.shortAnswer : undefined,
      timerSeconds: parsed.data.timerSeconds ?? null,
    };

    const question = await prisma.question.create({ data: questionData });

    if (hasImage) {
      const imageUrl = await uploadQuestionImage(image, testId, question.id);
      await prisma.question.update({
        where: { id: question.id },
        data: { imageUrl },
      });
    }

    revalidatePath(`/dashboard/tests/${testId}`);
    return { success: true, data: { questionId: question.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add question",
    };
  }
}

export async function updateQuestion(
  questionId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const question = await prisma.question.findFirst({
      where: { id: questionId },
      include: { test: true, options: true },
    });
    if (!question || question.test.teacherId !== teacher.id) {
      return { success: false, error: "Question not found" };
    }

    const image = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";
    const updateFields: Record<string, unknown> = {
      text: formData.get("text") as string,
      marks: Number(formData.get("marks")),
      timerSeconds: formData.get("timerSeconds")
        ? Number(formData.get("timerSeconds"))
        : null,
    };

    if (question.type === "MCQ") {
      updateFields.explanation = formData.get("explanation") ?? "";
      const optionsJson = formData.get("options") as string;
      const options = JSON.parse(optionsJson) as { text: string; isCorrect: boolean }[];
      if (!options.some((o) => o.isCorrect)) {
        return { success: false, error: "Select a correct answer" };
      }
      await prisma.questionOption.deleteMany({ where: { questionId } });
      await prisma.questionOption.createMany({
        data: options.map((o, i) => ({
          questionId,
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: i,
        })),
      });
    } else if (question.type === "SHORT") {
      updateFields.shortAnswer = formData.get("shortAnswer") ?? "";
    }

    if (removeImage && question.imageUrl) {
      await deleteQuestionImage(question.imageUrl);
      updateFields.imageUrl = null;
    }

    if (image && image.size > 0) {
      if (question.imageUrl) await deleteQuestionImage(question.imageUrl);
      updateFields.imageUrl = await uploadQuestionImage(
        image,
        question.testId,
        questionId
      );
    }

    await prisma.question.update({ where: { id: questionId }, data: updateFields });
    revalidatePath(`/dashboard/tests/${question.testId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const question = await prisma.question.findFirst({
      where: { id: questionId },
      include: { test: true },
    });
    if (!question || question.test.teacherId !== teacher.id) {
      return { success: false, error: "Question not found" };
    }

    if (question.imageUrl) await deleteQuestionImage(question.imageUrl);
    await prisma.question.delete({ where: { id: questionId } });

    const remaining = await prisma.question.findMany({
      where: { testId: question.testId },
      orderBy: { orderIndex: "asc" },
    });
    await Promise.all(
      remaining.map((q, i) =>
        prisma.question.update({ where: { id: q.id }, data: { orderIndex: i } })
      )
    );

    revalidatePath(`/dashboard/tests/${question.testId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function reorderQuestions(
  testId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    const { teacher } = await requireTeacher();
    const test = await assertTestOwnership(testId, teacher.id);
    if (!test) return { success: false, error: "Test not found" };

    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.question.update({ where: { id }, data: { orderIndex: index } })
      )
    );

    revalidatePath(`/dashboard/tests/${testId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Reorder failed" };
  }
}
