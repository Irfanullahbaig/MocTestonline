import Link from "next/link";
import { ClipboardList, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/teacher";
import { Button } from "@/components/ui";

export function DashboardNav({ teacherName }: { teacherName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ClipboardList className="h-5 w-5" />
          </div>
          <span>MocTest</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-600 sm:block">
            {teacherName}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
