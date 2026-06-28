import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getTestForTeacher } from "@/lib/actions/teacher";
import { DashboardNav } from "@/components/dashboard/nav";
import { QuestionEditor } from "@/components/dashboard/question-editor";
import { TestSettingsForm } from "@/components/dashboard/test-settings-form";
import { PublishPanel } from "@/components/dashboard/publish-panel";
import { Button, Card, StatusBadge } from "@/components/ui";
import { calculateMaxScore, formatDateTime } from "@/lib/utils";
import { ExportButton } from "@/components/dashboard/export-button";

export default async function TestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const { tab = "questions" } = await searchParams;
  const test = await getTestForTeacher(id);

  if (!test) notFound();

  const maxScore = calculateMaxScore(test.questions);
  const tabs = [
    { id: "questions", label: "Questions" },
    { id: "settings", label: "Settings" },
    { id: "publish", label: "Publish" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav teacherName={teacher.name} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{test.title}</h1>
              <StatusBadge status={test.status} />
            </div>
            <p className="mt-1 text-slate-600">
              {test.className} · {test.subject} · {test.questions.length} questions ·{" "}
              {maxScore} marks
            </p>
            {(test.startAt || test.endAt) && (
              <p className="mt-1 text-sm text-slate-500">
                {test.startAt && `Starts ${formatDateTime(test.startAt)}`}
                {test.startAt && test.endAt && " · "}
                {test.endAt && `Ends ${formatDateTime(test.endAt)}`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/tests/${id}/submissions`}>
              <Button variant="outline">
                <Users className="h-4 w-4" />
                Submissions ({test._count.attempts})
              </Button>
            </Link>
            <ExportButton testId={id} />
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-slate-200">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/tests/${id}?tab=${t.id}`}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="mt-6">
          {tab === "questions" && (
            <QuestionEditor
              testId={test.id}
              questions={test.questions}
              timerMode={test.timerMode}
            />
          )}
          {tab === "settings" && (
            <TestSettingsForm
              testId={test.id}
              settings={{
                timerMode: test.timerMode,
                defaultQuestionSeconds: test.defaultQuestionSeconds,
                allowSkip: test.allowSkip,
                allowReturnToSkipped: test.allowReturnToSkipped,
                allowRetake: test.allowRetake,
                disableCopyPaste: test.disableCopyPaste,
                requireFullscreen: test.requireFullscreen,
              }}
            />
          )}
          {tab === "publish" && (
            <PublishPanel
              testId={test.id}
              published={test.published}
              status={test.status}
              questionCount={test.questions.length}
            />
          )}
        </div>

        {tab === "questions" && (
          <Card className="mt-8">
            <h3 className="font-semibold text-slate-900">Test Details</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {test.instructions || "No instructions provided."}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
