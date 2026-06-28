export function formatAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Signup email limit reached. Supabase allows only 2 auth emails per hour on the default mailer. Disable “Confirm email” under Supabase → Authentication → Providers → Email for testing, or configure custom SMTP under Authentication → Emails → SMTP Settings, then try again in about an hour.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the confirmation link.";
  }

  return message;
}
