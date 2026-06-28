import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            M
          </div>
          MocTest
        </div>
        <Link href="/login">
          <Button variant="primary">Teacher Login</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Online tests made simple for teachers and students
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Create MCQ, short answer, and long answer tests. Share a public link.
            Students join with an approval password — no account required.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Rich question types",
              desc: "MCQs with images, short answers, and long-form responses with manual grading.",
            },
            {
              icon: Clock,
              title: "Smart timers",
              desc: "Per-question or uniform timers, autosave, and auto-submit when time runs out.",
            },
            {
              icon: Shield,
              title: "Secure access",
              desc: "Approval passwords, tab-switch tracking, and optional copy-paste restrictions.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
