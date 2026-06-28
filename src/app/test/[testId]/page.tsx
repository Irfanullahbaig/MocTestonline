import { notFound } from "next/navigation";
import { getPublicTest } from "@/lib/actions/student";
import { StudentTestPage } from "@/components/student/test-page";
import { formatDateTime } from "@/lib/utils";

export default async function PublicTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = await getPublicTest(testId);

  if (!test) notFound();

  if ("notYetOpen" in test && test.notYetOpen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="mt-4 text-slate-400">
            This test opens on {formatDateTime(test.startAt)}
          </p>
        </div>
      </div>
    );
  }

  if ("closed" in test && test.closed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="mt-4 text-slate-400">This test has ended.</p>
        </div>
      </div>
    );
  }

  return (
    <StudentTestPage
      testId={test.id}
      testTitle={test.title}
      expectedClass={test.className}
      instructions={test.instructions}
      questionCount={test._count.questions}
      durationMinutes={test.totalDurationMinutes}
    />
  );
}
