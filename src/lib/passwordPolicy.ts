// Shared by the API (enforcement) and the signup form (live feedback).
// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected instead of silently truncated.
export const MAX_PASSWORD_BYTES = 72;

const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "qwerty123", "qwertyuiop", "12345678", "123456789",
  "1234567890", "letmein123", "admin123", "welcome1", "welcome123", "iloveyou1", "abc12345", "changeme1",
]);

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", message: "Password must be at least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "letter", label: "Contains a letter", message: "Password must contain a letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { id: "number", label: "Contains a number", message: "Password must contain a number", test: (p: string) => /\d/.test(p) },
] as const;

export function passwordIssues(p: string): string[] {
  const issues: string[] = PASSWORD_RULES.filter((r) => !r.test(p)).map((r) => r.message);
  if (new TextEncoder().encode(p).length > MAX_PASSWORD_BYTES) issues.push(`Password must be at most ${MAX_PASSWORD_BYTES} bytes`);
  if (COMMON.has(p.toLowerCase())) issues.push("That password is too common — choose a different one");
  return issues;
}

/** 0 (empty) .. 4 (strong) — purely advisory, for the strength meter. */
export function passwordStrength(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p)) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (COMMON.has(p.toLowerCase())) return 1;
  return Math.max(1, s);
}
