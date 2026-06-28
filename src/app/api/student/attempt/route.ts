import { NextResponse } from "next/server";
import { getAttemptForStudent } from "@/lib/actions/student";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get("attemptId");
  const token = searchParams.get("token");

  if (!attemptId || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const data = await getAttemptForStudent(attemptId, token);
  if (!data) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 403 });
  }

  return NextResponse.json({
    test: data.attempt.test,
    questions: data.questions,
    initialAnswers: data.attempt.answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      textAnswer: a.textAnswer,
      isSkipped: a.isSkipped,
    })),
  });
}
