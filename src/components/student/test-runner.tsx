"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  saveAnswer,
  recordTabSwitch,
  submitAttempt,
} from "@/lib/actions/student";
import { Button, Spinner } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

type PublicQuestion = {
  id: string;
  type: "MCQ" | "SHORT" | "LONG";
  text: string;
  imageUrl: string | null;
  marks: number;
  orderIndex: number;
  timerSeconds: number;
  options: { id: string; text: string }[];
};

type SavedAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isSkipped: boolean;
};

type TestConfig = {
  id: string;
  title: string;
  totalDurationMinutes: number;
  allowSkip: boolean;
  allowReturnToSkipped: boolean;
  disableCopyPaste: boolean;
  requireFullscreen: boolean;
};

export function StudentTestRunner({
  attemptId,
  sessionToken,
  test,
  questions,
  initialAnswers,
}: {
  attemptId: string;
  sessionToken: string;
  test: TestConfig;
  questions: PublicQuestion[];
  initialAnswers: SavedAnswer[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, SavedAnswer>>(() => {
    const map = new Map<string, SavedAnswer>();
    initialAnswers.forEach((a) => map.set(a.questionId, a));
    return map;
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [totalTimeLeft, setTotalTimeLeft] = useState(
    test.totalDurationMinutes * 60
  );
  const [mode, setMode] = useState<"test" | "review" | "done">("test");
  const [tabWarnings, setTabWarnings] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<{ total: number; max: number } | null>(
    null
  );
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancingRef = useRef(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const getAnswer = useCallback(
    (qId: string) =>
      answers.get(qId) ?? {
        questionId: qId,
        selectedOptionId: null,
        textAnswer: null,
        isSkipped: false,
      },
    [answers]
  );

  const persistAnswer = useCallback(
    async (qId: string, data: Partial<SavedAnswer>) => {
      const existing = getAnswer(qId);
      const merged = { ...existing, ...data, questionId: qId };
      setAnswers((prev) => new Map(prev).set(qId, merged));
      await saveAnswer(attemptId, sessionToken, qId, merged);
    },
    [attemptId, sessionToken, getAnswer]
  );

  const loadQuestionState = useCallback(
    (index: number) => {
      const q = questions[index];
      const saved = getAnswer(q.id);
      setSelectedOption(saved.selectedOptionId);
      setTextAnswer(saved.textAnswer ?? "");
      setQuestionTimeLeft(q.timerSeconds);
    },
    [questions, getAnswer]
  );

  useEffect(() => {
    loadQuestionState(currentIndex);
  }, [currentIndex, loadQuestionState]);

  const handleFinalSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = await submitAttempt(attemptId, sessionToken);
    setSubmitting(false);
    if (result.success) {
      setFinalScore({ total: result.data.totalScore, max: result.data.maxScore });
      setMode("done");
    }
  }, [attemptId, sessionToken, submitting]);

  const goNext = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const q = questions[currentIndex];
    await persistAnswer(q.id, {
      selectedOptionId: selectedOption,
      textAnswer: textAnswer || null,
      isSkipped: false,
    });

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setMode("review");
    }
    advancingRef.current = false;
  }, [currentIndex, totalQuestions, questions, selectedOption, textAnswer, persistAnswer]);

  const handleSkip = useCallback(async () => {
    if (!test.allowSkip || advancingRef.current) return;
    advancingRef.current = true;
    const q = questions[currentIndex];
    await persistAnswer(q.id, {
      selectedOptionId: null,
      textAnswer: null,
      isSkipped: true,
    });
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setMode("review");
    }
    advancingRef.current = false;
  }, [test.allowSkip, currentIndex, questions, persistAnswer, totalQuestions]);

  useEffect(() => {
    if (mode !== "test") return;
    const interval = setInterval(() => {
      setQuestionTimeLeft((t) => t - 1);
      setTotalTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== "test" || questionTimeLeft > 0) return;
    void goNext();
  }, [questionTimeLeft, mode, goNext]);

  useEffect(() => {
    if (mode !== "test" || totalTimeLeft > 0) return;
    void handleFinalSubmit();
  }, [totalTimeLeft, mode, handleFinalSubmit]);

  useEffect(() => {
    if (mode !== "test" || currentQuestion?.type === "MCQ") return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      persistAnswer(currentQuestion.id, {
        textAnswer: textAnswer || null,
        selectedOptionId: null,
        isSkipped: false,
      });
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [textAnswer, currentQuestion, mode, persistAnswer]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && mode === "test") {
        recordTabSwitch(attemptId, sessionToken);
        setTabWarnings((w) => w + 1);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [attemptId, sessionToken, mode]);

  useEffect(() => {
    if (!test.requireFullscreen || mode !== "test") return;
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [test.requireFullscreen, mode]);

  useEffect(() => {
    if (!test.disableCopyPaste || mode !== "test") return;
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("cut", prevent);
    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("cut", prevent);
    };
  }, [test.disableCopyPaste, mode]);

  const skipped = questions.filter((q) => getAnswer(q.id).isSkipped);
  const answered = questions.filter((q) => {
    const a = getAnswer(q.id);
    return !a.isSkipped && (a.selectedOptionId || a.textAnswer?.trim());
  });
  const unanswered = questions.filter((q) => {
    const a = getAnswer(q.id);
    return !a.isSkipped && !a.selectedOptionId && !a.textAnswer?.trim();
  });

  if (mode === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✓
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Test Submitted!</h2>
          <p className="mt-2 text-slate-600">
            Your answers have been saved successfully.
          </p>
          {finalScore && (
            <p className="mt-4 text-lg font-semibold text-indigo-600">
              Auto-graded score: {finalScore.total}/{finalScore.max}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-500">
            Short and long answers will be graded by your teacher.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "review") {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">Review Your Answers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Time remaining: {formatDuration(totalTimeLeft)}
          </p>

          <div className="mt-6 space-y-4">
            <ReviewSection
              title="Answered"
              color="emerald"
              items={answered.map((q) => ({
                num: q.orderIndex + 1,
                id: q.id,
              }))}
              onRevisit={(id) => {
                const idx = questions.findIndex((q) => q.id === id);
                setCurrentIndex(idx);
                setMode("test");
              }}
            />
            <ReviewSection
              title="Skipped"
              color="amber"
              items={skipped.map((q) => ({
                num: q.orderIndex + 1,
                id: q.id,
              }))}
              onRevisit={
                test.allowReturnToSkipped
                  ? (id) => {
                      const idx = questions.findIndex((q) => q.id === id);
                      setCurrentIndex(idx);
                      setMode("test");
                    }
                  : undefined
              }
            />
            <ReviewSection
              title="Unanswered"
              color="red"
              items={unanswered.map((q) => ({
                num: q.orderIndex + 1,
                id: q.id,
              }))}
              onRevisit={(id) => {
                const idx = questions.findIndex((q) => q.id === id);
                setCurrentIndex(idx);
                setMode("test");
              }}
            />
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setMode("test");
                setCurrentIndex(totalQuestions - 1);
              }}
            >
              Back to Test
            </Button>
            <Button
              className="flex-1"
              onClick={handleFinalSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Test"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{test.title}</p>
            <p className="font-medium">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-slate-400">Question</p>
              <p
                className={`font-mono font-bold ${questionTimeLeft <= 10 ? "text-red-400" : ""}`}
              >
                {formatDuration(questionTimeLeft)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-400">Total</p>
              <p
                className={`font-mono font-bold ${totalTimeLeft <= 60 ? "text-red-400" : ""}`}
              >
                {formatDuration(totalTimeLeft)}
              </p>
            </div>
          </div>
        </div>
        {tabWarnings > 0 && (
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-amber-400">
            Warning: You switched tabs {tabWarnings} time(s). This is recorded.
          </p>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl bg-white p-6 text-slate-900 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
              {currentQuestion.type} · {currentQuestion.marks} marks
            </span>
          </div>
          <p className="mt-4 text-lg leading-relaxed">{currentQuestion.text}</p>
          {currentQuestion.imageUrl && (
            <div className="relative mt-4 h-56 w-full overflow-hidden rounded-lg bg-slate-100">
              <Image
                src={currentQuestion.imageUrl}
                alt="Question illustration"
                fill
                className="object-contain"
              />
            </div>
          )}

          {currentQuestion.type === "MCQ" && (
            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                    selectedOption === opt.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="option"
                    checked={selectedOption === opt.id}
                    onChange={() => setSelectedOption(opt.id)}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span>{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === "SHORT" && (
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          )}

          {currentQuestion.type === "LONG" && (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Write your detailed answer..."
              rows={8}
              className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {currentIndex > 0 && test.allowReturnToSkipped && (
            <Button
              variant="outline"
              className="border-slate-600 bg-transparent text-white hover:bg-slate-800"
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              Previous
            </Button>
          )}
          {test.allowSkip && (
            <Button
              variant="ghost"
              className="text-slate-300 hover:bg-slate-800"
              onClick={handleSkip}
            >
              Skip
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            className="border-slate-600 bg-transparent text-white hover:bg-slate-800"
            onClick={() => setMode("review")}
          >
            Review
          </Button>
          <Button onClick={goNext}>
            {currentIndex < totalQuestions - 1 ? "Save & Next" : "Save & Review"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function ReviewSection({
  title,
  color,
  items,
  onRevisit,
}: {
  title: string;
  color: "emerald" | "amber" | "red";
  items: { num: number; id: string }[];
  onRevisit?: (id: string) => void;
}) {
  const colors = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <div>
      <h3 className={`font-medium ${colors[color]}`}>
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">None</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRevisit?.(item.id)}
              disabled={!onRevisit}
              className={`rounded-lg px-3 py-1 text-sm ${
                onRevisit
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              Q{item.num}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentTestLoader({
  attemptId,
  sessionToken,
}: {
  attemptId: string;
  sessionToken: string;
}) {
  const [data, setData] = useState<{
    test: TestConfig;
    questions: PublicQuestion[];
    initialAnswers: SavedAnswer[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/student/attempt?attemptId=${attemptId}&token=${sessionToken}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError("Failed to load test"));
  }, [attemptId, sessionToken]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Spinner className="h-8 w-8 border-white" />
      </div>
    );
  }

  return (
    <StudentTestRunner
      attemptId={attemptId}
      sessionToken={sessionToken}
      test={data.test}
      questions={data.questions}
      initialAnswers={data.initialAnswers}
    />
  );
}
