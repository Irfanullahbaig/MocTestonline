import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireTeacher() {
  const user = await getSession();
  if (!user) redirect("/login");

  let teacher = await prisma.teacher.findUnique({
    where: { authId: user.id },
  });

  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        authId: user.id,
        email: user.email ?? "",
        name:
          (user.user_metadata?.full_name as string) ??
          user.email?.split("@")[0] ??
          "Teacher",
      },
    });
  }

  return { user, teacher };
}

export async function getTeacherOptional() {
  const user = await getSession();
  if (!user) return null;

  const teacher = await prisma.teacher.findUnique({
    where: { authId: user.id },
  });

  return teacher ? { user, teacher } : null;
}
