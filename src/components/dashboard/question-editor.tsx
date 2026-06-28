"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { addQuestion, deleteQuestion } from "@/lib/actions/questions";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import type { Question, QuestionOption } from "@prisma/client";

type QuestionWithOptions = Question & { options: QuestionOption[] };

export function QuestionEditor({
  testId,
  questions: initialQuestions,
  timerMode,
}: {
  testId: string;
  questions: QuestionWithOptions[];
  timerMode: string;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"MCQ" | "SHORT" | "LONG">("MCQ");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [mcqOptions, setMcqOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    if (type === "MCQ") {
      formData.set("options", JSON.stringify(mcqOptions));
    }
    const result = await addQuestion(testId, type, formData);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    await deleteQuestion(id);
    setQuestions((q) => q.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      {questions.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No questions yet. Add your first question below.
        </div>
      )}

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <div className="flex items-start gap-3">
            <GripVertical className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                  Q{idx + 1}
                </span>
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {q.type}
                </span>
                <span className="text-xs text-slate-500">{q.marks} marks</span>
              </div>
              <p className="mt-2 text-slate-900">{q.text}</p>
              {q.imageUrl && (
                <div className="relative mt-3 h-40 w-full max-w-md overflow-hidden rounded-lg">
                  <Image
                    src={q.imageUrl}
                    alt="Question"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              {q.type === "MCQ" && (
                <ul className="mt-3 space-y-1">
                  {q.options.map((o) => (
                    <li
                      key={o.id}
                      className={`text-sm ${o.isCorrect ? "font-medium text-emerald-700" : "text-slate-600"}`}
                    >
                      {o.isCorrect ? "✓ " : "○ "}
                      {o.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(q.id)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {showForm ? (
        <Card>
          <h3 className="font-semibold">Add Question</h3>
          <form onSubmit={handleAdd} className="mt-4 space-y-4">
            <Select
              label="Question Type"
              value={type}
              onChange={(e) => setType(e.target.value as "MCQ" | "SHORT" | "LONG")}
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="SHORT">Short Answer</option>
              <option value="LONG">Long Answer</option>
            </Select>
            <Textarea name="text" label="Question Text" required rows={3} />
            <Input name="marks" label="Marks" type="number" min={1} defaultValue={1} required />
            {timerMode === "CUSTOM_PER_QUESTION" && (
              <Input
                name="timerSeconds"
                label="Timer (seconds)"
                type="number"
                min={10}
                defaultValue={60}
              />
            )}
            <Input name="image" label="Image (optional)" type="file" accept="image/*" />

            {type === "MCQ" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Options</label>
                  {mcqOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() =>
                          setMcqOptions((opts) =>
                            opts.map((o, j) => ({ ...o, isCorrect: j === i }))
                          )
                        }
                      />
                      <input
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder={`Option ${i + 1}`}
                        value={opt.text}
                        onChange={(e) =>
                          setMcqOptions((opts) =>
                            opts.map((o, j) =>
                              j === i ? { ...o, text: e.target.value } : o
                            )
                          )
                        }
                        required
                      />
                    </div>
                  ))}
                </div>
                <Textarea name="explanation" label="Explanation (optional)" rows={2} />
              </>
            )}

            {type === "SHORT" && (
              <Input
                name="shortAnswer"
                label="Model Answer (for reference)"
                placeholder="Expected short answer"
              />
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Question"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      )}
    </div>
  );
}
