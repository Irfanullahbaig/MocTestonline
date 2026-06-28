import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getDashboardTests } from "@/lib/actions/teacher";
import { DashboardNav } from "@/components/dashboard/nav";
import { Button, Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const { teacher } = await requireTeacher();
  const tests = await getDashboardTests();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav teacherName={teacher.name} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-slate-600">
              Manage your tests and view student submissions
            </p>
          </div>
          <Link href="/dashboard/tests/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create New Test
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          {tests.length === 0 ? (
            <EmptyState
              title="No tests yet"
              description="Create your first test to get started. Add questions, configure settings, and share the public link with students."
              action={
                <Link href="/dashboard/tests/new">
                  <Button>Create Your First Test</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <Link key={test.id} href={`/dashboard/tests/${test.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">
                        {test.title}
                      </h3>
                      <StatusBadge status={test.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {test.className} · {test.subject}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>{test.questionCount} questions</span>
                      <span>{test.maxScore} marks</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {test.attemptCount} attempts
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Updated {formatDateTime(test.updatedAt)}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
