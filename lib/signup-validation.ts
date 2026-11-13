// Sign-up field validation, shared by the client form
// (components/auth/SignupForm.tsx) and the server action
// (app/(auth)/actions.ts signupAction), so the inline message and the server's
// refusal can never disagree. Pure, no imports: it runs in both bundles.
//
// Every validator returns an English message, which is also its translation
// key (lib/translations.json), or null when the value is fine.

const NAME_MAX = 50;

// Letters of any script, combining marks (Thai upper/lower vowels and tone
// marks are \p{M}), space, apostrophe (' and ’), hyphen and dot ("ม.ล.",
// "Jean-Luc", "O'Neil"), starting with a letter. Digits, emoji, @ and / fail.
const NAME_CHARS = /^\p{L}[\p{L}\p{M} '’.-]*$/u;
const NAME_LETTERS = /[\p{L}\p{M}]/gu;
// In Han, Hangul, Hiragana and Katakana one character is a real name (李, 이),
// so the 2-letter floor would refuse real people there.
const ONE_CHAR_SCRIPTS =
  /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export function validateName(
  raw: string,
  opts: { required: boolean },
): string | null {
  const name = raw.trim();
  if (!name) return opts.required ? "Enter your first name" : null;
  if (name.length > NAME_MAX) return "Too long";
  if (!NAME_CHARS.test(name)) return "Letters only";
  const letters = name.match(NAME_LETTERS)?.length ?? 0;
  if (letters < 2 && !ONE_CHAR_SCRIPTS.test(name)) return "At least 2 letters";
  return null;
}

// ASCII only on purpose: Supabase Auth rejects non-ASCII addresses anyway, so
// accepting one here would only move the refusal to a vaguer server error.
// The domain needs at least one dot and a 2+ letter TLD (or a punycode xn--
// TLD) because the browser's type=email accepts "s@s", a dotless domain no
// real mailbox lives at - which is how the owner got a silent form.
const EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

export function validateEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email) return "Enter your email";
  if (email.length > 254) return "Not a valid email";
  const local = email.slice(0, email.lastIndexOf("@"));
  if (
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !EMAIL.test(email)
  ) {
    return "Not a valid email";
  }
  return null;
}

// True when the value holds anything outside ASCII - for the password
// field's "Thai keyboard on?" warning.
export function hasNonAscii(value: string): boolean {
  return /[^\x00-\x7F]/.test(value);
}
