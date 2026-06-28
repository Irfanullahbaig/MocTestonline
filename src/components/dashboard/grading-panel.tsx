"use client";

import { useState } from "react";
import { gradeAnswer } from "@/lib/actions/student";
import { Button, Textarea, Input, Badge } from "@/components/ui";

type AnswerItem = {
  id: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isSkipped: boolean;
  marksAwarded: number | null;
  gradingStatus: string;
  question: {
    id: string;
    type: string;
    text: string;
    marks: number;
    shortAnswer: string | null;
    options: { id: string; text: string; isCorrect: boolean }[];
  };
  feedback: { feedback: string } | null;
};

export function GradingPanel({ answers }: { answers: AnswerItem[] }) {
  return (
    <div className="space-y-6">
      {answers.map((answer, idx) => (
        <AnswerGrader key={answer.id} answer={answer} index={idx + 1} />
      ))}
    </div>
  );
}

function AnswerGrader({
  answer,
  index,
}: {
  answer: AnswerItem;
  index: number;
}) {
  const [marks, setMarks] = useState(
    answer.marksAwarded?.toString() ?? ""
  );
  const [feedback, setFeedback] = useState(answer.feedback?.feedback ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const q = answer.question;
  const needsManual = q.type !== "MCQ";

  async function handleGrade() {
    setLoading(true);
    const result = await gradeAnswer(
      answer.id,
      Number(marks),
      feedback
    );
    setLoading(false);
    setMessage(result.success ? "Saved" : result.error);
  }

  const selectedOption = q.options.find((o) => o.id === answer.selectedOptionId);
  const correctOption = q.options.find((o) => o.isCorrect);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <span className="font-medium">Q{index}</span>
        <Badge>{q.type}</Badge>
        <span className="text-sm text-slate-500">{q.marks} marks</span>
        {answer.isSkipped && <Badge variant="warning">Skipped</Badge>}
      </div>
      <p className="mt-2 text-slate-900">{q.text}</p>

      <div className="mt-4 rounded-lg bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Student Answer</p>
        {q.type === "MCQ" ? (
          <p className="mt-1 text-slate-900">
            {answer.isSkipped
              ? "Skipped"
              : selectedOption?.text ?? "No answer"}
          </p>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-slate-900">
            {answer.isSkipped
              ? "Skipped"
              : answer.textAnswer || "No answer"}
          </p>
        )}
        {q.type === "MCQ" && correctOption && (
          <p className="mt-2 text-sm text-emerald-700">
            Correct: {correctOption.text}
          </p>
        )}
        {q.type === "SHORT" && q.shortAnswer && (
          <p className="mt-2 text-sm text-slate-500">
            Model answer: {q.shortAnswer}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-slate-600">Status:</span>
        <Badge
          variant={
            answer.gradingStatus === "PENDING"
              ? "warning"
              : answer.gradingStatus === "AUTO_GRADED"
                ? "info"
                : "success"
          }
        >
          {answer.gradingStatus.replace("_", " ")}
        </Badge>
        {answer.marksAwarded !== null && (
          <span className="text-sm font-medium">
            Score: {answer.marksAwarded}/{q.marks}
          </span>
        )}
      </div>

      {needsManual && answer.gradingStatus === "PENDING" && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <Input
            label={`Marks (0-${q.marks})`}
            type="number"
            min={0}
            max={q.marks}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
          <Textarea
            label="Feedback"
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <Button onClick={handleGrade} disabled={loading} size="sm">
            {loading ? "Saving..." : "Save Grade"}
          </Button>
          {message && (
            <p className={`text-sm ${message === "Saved" ? "text-emerald-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
      )}

      {needsManual && answer.gradingStatus === "MANUALLY_GRADED" && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <Input
            label={`Update marks (0-${q.marks})`}
            type="number"
            min={0}
            max={q.marks}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
          <Textarea
            label="Feedback"
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="mt-3"
          />
          <Button onClick={handleGrade} disabled={loading} size="sm" className="mt-3">
            Update Grade
          </Button>
        </div>
      )}
    </div>
  );
}
