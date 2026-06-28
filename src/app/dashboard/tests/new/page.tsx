import { requireTeacher } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";
import { TestWizard } from "@/components/dashboard/test-wizard";

export default async function NewTestPage() {
  const { teacher } = await requireTeacher();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav teacherName={teacher.name} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Create New Test</h1>
        <p className="mt-1 text-slate-600">
          Follow the steps to set up your test
        </p>
        <div className="mt-8">
          <TestWizard />
        </div>
      </main>
    </div>
  );
}
