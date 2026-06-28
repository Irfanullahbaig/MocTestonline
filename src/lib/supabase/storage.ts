import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const QUESTION_IMAGES_BUCKET = "question-images";

export async function uploadQuestionImage(
  file: File,
  testId: string,
  questionId: string
): Promise<string> {
  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${testId}/${questionId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(QUESTION_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = admin.storage
    .from(QUESTION_IMAGES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteQuestionImage(imageUrl: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const url = new URL(imageUrl);
    const parts = url.pathname.split("/");
    const bucketIndex = parts.indexOf(QUESTION_IMAGES_BUCKET);
    if (bucketIndex === -1) return;
    const path = parts.slice(bucketIndex + 1).join("/");
    await admin.storage.from(QUESTION_IMAGES_BUCKET).remove([path]);
  } catch {
    // ignore cleanup errors
  }
}
