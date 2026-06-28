import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getSubmissionDetail } from "@/lib/actions/teacher";
import { DashboardNav } from "@/components/dashboard/nav";
import { GradingPanel } from "@/components/dashboard/grading-panel";
import { StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id, attemptId } = await params;
  const submission = await getSubmissionDetail(id, attemptId);

  if (!submission) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav teacherName={teacher.name} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/dashboard/tests/${id}/submissions`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-slate-900">{submission.fullName}</h1>
          <p className="mt-1 text-slate-600">
            {submission.className} · Roll {submission.rollNumber}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span>
              Score:{" "}
              <strong>
                {submission.totalScore}/{submission.maxScore}
              </strong>
            </span>
            <StatusBadge status={submission.status} />
            <span className="text-slate-500">
              Submitted {formatDateTime(submission.submittedAt)}
            </span>
            <span className="text-slate-500">
              Tab switches: {submission.tabSwitchCount}
            </span>
          </div>
        </div>

        <div className="mt-8">
          <GradingPanel answers={submission.answers} />
        </div>
      </main>
    </div>
  );
}
