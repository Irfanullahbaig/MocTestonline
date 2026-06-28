import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getTestSubmissions } from "@/lib/actions/teacher";
import { DashboardNav } from "@/components/dashboard/nav";
import { StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const submissions = await getTestSubmissions(id);

  if (submissions === null) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav teacherName={teacher.name} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          href={`/dashboard/tests/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to test
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Submissions</h1>

        {submissions.length === 0 ? (
          <p className="mt-8 text-center text-slate-500">
            No submissions yet. Share the public test link with students.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Class</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Roll No.</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Score</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Submitted</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Tab Switches</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/tests/${id}/submissions/${s.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {s.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.className}</td>
                    <td className="px-4 py-3 text-slate-600">{s.rollNumber}</td>
                    <td className="px-4 py-3 font-medium">
                      {s.totalScore}/{s.maxScore}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(s.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.tabSwitchCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
