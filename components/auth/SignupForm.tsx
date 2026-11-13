"use client";

import { useActionState, useId, useState, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, Mail, X } from "lucide-react";
import { signupAction, type SignupState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";
import { FEATURES } from "@/lib/features";
import { useT } from "@/lib/i18n-client";
import type { AccountRole } from "@/lib/roles";
import {
  hasNonAscii,
  validateEmail,
  validateName,
} from "@/lib/signup-validation";

const INITIAL: SignupState = { step: "credentials" };

type Field = "firstName" | "lastName" | "email" | "password" | "confirmPassword";

// Client-side mirror of validatePassword() in app/(auth)/actions.ts.
// Server re-checks on submit; this is for inline feedback only.
const passwordRules = (pw: string) => ({
  length: pw.length >= 8,
  letter: /[a-zA-Z]/.test(pw),
  number: /[0-9]/.test(pw),
});

// Registration persona. Admin is NOT here — it's a granted privilege, never
// self-selected.
//
// The copy describes what you came to DO, not what you ARE: the pivot is one
// level earlier than "startup", so the person we want has no company to name
// themselves after yet — "Founder / Company" asked them to claim a title they
// haven't earned. An explorer is here to TRY what the community builds, which
// is the demand side of /products.
//
// Investor stays in the list and is filtered out by FEATURES.investorSignup
// (false today). It is NOT deleted: there are real investor accounts in
// production, and flipping that flag has to put this option back exactly here
// rather than require someone to reconstruct it. See lib/features.ts.
const ACCOUNT_TYPES = [
  {
    value: "founder",
    en: "I'm building something",
    hint: "Show it, find your first users",
  },
  {
    value: "explorer",
    en: "I want to try new things",
    hint: "Try what the community builds",
  },
  { value: "investor", en: "Investor", hint: "Back startups · early access" },
] as const satisfies readonly { value: AccountRole; en: string; hint: string }[];

/**
 * The sign-up action's state, held by the PAGE (app/(auth)/signup/page.tsx)
 * for the same reason it holds the picked role: the role picker, the "or"
 * divider and the OAuth button are the form's siblings there (the picker in
 * the wide card's left column, "or" and Google under the form), and all three
 * have to go once the email is sent — which only this state knows.
 */
export function useSignupAction() {
  return useActionState<SignupState, FormData>(signupAction, INITIAL);
}

/**
 * Who you are joining as. Not inside the <form>: these are plain buttons that
 * set the page's state, and the value reaches the server through the form's
 * hidden `account_type` input and the OAuth buttons' `role` — so the picker can
 * sit beside both, in the wide card's left column (app/(auth)/signup/page.tsx).
 */
export function SignupRolePicker({
  value,
  onChange,
  className,
}: {
  value: AccountRole;
  onChange: (value: AccountRole) => void;
  className?: string;
}) {
  const tr = useT();
  const labelId = useId();
  const options = ACCOUNT_TYPES.filter(
    (opt) => opt.value !== "investor" || FEATURES.investorSignup,
  );
  // The old copy ("This can't be changed later — founders and investors use
  // separate accounts") was false on both halves once the explorer role
  // shipped: explorer -> founder is a deliberate one-way upgrade, because it is
  // the funnel — try things, get inspired, build something. It still is not a
  // general role switcher, so this says which way the door opens and nothing
  // more — in one short line (the owner's call, 2026-11-11: the old two-line
  // version was too much text under two cards that already explain themselves).
  const hint = tr("Not sure? Try things first — build your own later.");

  return (
    <div className={className}>
      <span
        id={labelId}
        className="mb-2 block text-xs uppercase tracking-[0.15em] text-ink-muted"
      >
        {tr("I'm joining as")}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-1"
      >
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            // two-line selection cards, not pills — the base rule would give
            // these ~32px end-caps. Stacked on a phone, where side by side
            // they were ~150px wide and wrapped to three lines; side by side
            // in the 640-767px single card; stacked again from md, in the wide
            // card's narrow left column.
            //
            // Two options fill the 2-col grid exactly. A THIRD (flip
            // FEATURES.investorSignup back on) would otherwise leave a
            // half-width orphan on row 2, which reads as a layout bug rather
            // than a choice — so an odd last card spans the row where there
            // are two columns, and only there (a span of 2 in a one-column
            // grid would invent a second column). With an even count it
            // contributes no class, so today's two cards render exactly as
            // before.
            className={`text-left p-3 rounded-xl border transition-colors ${
              i === options.length - 1 && options.length % 2 === 1
                ? "sm:col-span-2 md:col-span-1"
                : ""
            } ${
              value === opt.value
                ? "bg-cream border-navy"
                : "bg-white border-line hover:border-navy"
            }`}
          >
            <span className="block text-sm text-navy font-medium">
              {tr(opt.en)}
            </span>
            <span className="block text-xs text-ink-muted mt-0.5">
              {tr(opt.hint)}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

export function SignupForm({
  accountType,
  next,
  state,
  formAction,
  isPending,
}: {
  // The picked role is OWNED BY THE PAGE, not by this form. The OAuth buttons
  // are siblings of this component and have to send the same value — that is
  // the whole bug being fixed here (the role used to live in this component's
  // own useState and never left it, so every Google signup was born a
  // founder). app/(auth)/signup/page.tsx holds it; see the note there.
  accountType: AccountRole;
  /** The page's `?next=`, already checked; signupAction checks it again. */
  next?: string;
  /** useSignupAction(), from the page. */
  state: SignupState;
  formAction: (payload: FormData) => void;
  isPending: boolean;
}) {
  const tr = useT();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // A field's message shows once it has been left (blur) or the form has been
  // submitted, and then follows every keystroke. Before that, typing a first
  // letter would already shout "At least 2 letters".
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const touch = (f: Field) => () =>
    setTouched((t) => (t[f] ? t : { ...t, [f]: true }));

  if (state.step === "check_email") {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-4 p-5 bg-cream border border-line rounded-xl">
          <Mail className="w-6 h-6 text-gold-ink shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="space-y-2">
            <div className="text-navy font-medium">{tr("Check your email")}</div>
            <div className="text-sm text-ink leading-relaxed">
              {tr("We sent a confirmation link to")}{" "}
              <span className="text-navy font-medium">{state.email}</span>.{" "}
              {tr("Click it to activate your account.")}
            </div>
          </div>
        </div>
        <div className="text-xs text-ink-muted leading-relaxed">
          {tr(
            "Didn’t arrive? Check your spam folder. The link expires in 24 hours.",
          )}
        </div>
      </div>
    );
  }

  const rules = passwordRules(password);
  const allRulesPass = rules.length && rules.letter && rules.number;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  // English messages (translation keys) from lib/signup-validation.ts, the
  // same module signupAction re-checks with. A password that fails its rules
  // is caught like every other field (the owner, 2026-11-13: "password still
  // not catch" — it had only the grey checklist, no red border, no message):
  // the label row names the problem and the unmet rules below turn red. Thai
  // characters get their own message, because that is WHY the letter rule
  // fails for someone whose keyboard is on the Thai layout.
  const errors: Record<Field, string | null> = {
    firstName: validateName(firstName, { required: true }),
    lastName: validateName(lastName, { required: false }),
    email: validateEmail(email),
    password: !password
      ? "Enter a password"
      : allRulesPass
        ? null
        : hasNonAscii(password)
          ? "Thai keyboard on?"
          : "Not strong enough",
    confirmPassword: confirmPassword ? null : "Confirm your password",
  };
  const shown = (f: Field) =>
    (touched[f] || submitted) && errors[f] ? errors[f] : null;
  // Empty password/confirm only speak after a submit: blurring an empty
  // password on the way to the email field is not a mistake yet.
  const shownEmpty = (f: "password" | "confirmPassword") =>
    submitted ? errors[f] : null;
  const fieldClass = (f: Field, msg: string | null) =>
    `w-full px-4 py-3 border bg-white text-ink focus:outline-none rounded-xl ${
      msg
        ? "border-danger-line focus:border-danger-ink"
        : "border-line focus:border-navy"
    }${f === "password" ? " pr-11" : ""}`;
  const a11y = (f: Field, msg: string | null) =>
    msg
      ? { "aria-invalid": true as const, "aria-describedby": `${f}-error` }
      : {};

  const firstNameMsg = shown("firstName");
  const lastNameMsg = shown("lastName");
  const emailMsg = shown("email");
  // Empty: only after a submit (shownEmpty). Typed but failing its rules:
  // once the field has been left, or after a submit, like the other fields.
  const passwordMsg = password ? shown("password") : shownEmpty("password");
  const confirmMsg = shownEmpty("confirmPassword");
  // A Thai keyboard layout types Thai characters into the password, which
  // fail the letter rule and cannot be retyped at sign-in on another layout.
  // While the field is still being typed in (no error shown yet), or when the
  // password passes its rules anyway, this is a WARNING, not an error: it
  // does not block, and it is navy + weight because the palette has no
  // warning hue. Once the field is flagged the same words are the error.
  const keyboardWarning = !passwordMsg && hasNonAscii(password);

  // The button is never disabled for invalid input: a disabled button cannot
  // explain itself, which was the bug ("s" / "s@s" got a dead Continue and no
  // word why). Instead a submit with anything invalid is stopped here, every
  // message is revealed, and focus goes to the first bad field in DOM order.
  // When everything passes this does nothing and action={formAction} runs.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const order: [Field, boolean][] = [
      ["firstName", !!errors.firstName],
      ["lastName", !!errors.lastName],
      ["email", !!errors.email],
      ["password", !allRulesPass],
      ["confirmPassword", !passwordsMatch],
    ];
    const firstBad = order.find(([, bad]) => bad);
    if (!firstBad) return;
    e.preventDefault();
    setSubmitted(true);
    document.getElementById(firstBad[0])?.focus();
  };

  // space-y-4 and the two passwords side by side: the page has to fit one
  // screen at laptop heights, including while the password rules are showing.
  // Stacked below 640px, where side by side they were ~150px fields with the
  // rules wrapped to three lines under one of them; a phone scrolls anyway.
  return (
    // noValidate: the native bubbles would duplicate the label-row messages
    // (and type=email passes "s@s" anyway). required/minLength stay as
    // semantics (screen readers announce "required"); note noValidate turns
    // the bubbles off without JS too, which is fine because signupAction
    // re-validates every field with the same module.
    <form
      action={formAction}
      noValidate
      onSubmit={onSubmit}
      className="space-y-4 short:space-y-3"
    >
      <input type="hidden" name="account_type" value={accountType} />
      {next && <input type="hidden" name="next" value={next} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <LabelRow
            htmlFor="firstName"
            label={tr("First name")}
            error={firstNameMsg && tr(firstNameMsg)}
          />
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={touch("firstName")}
            {...a11y("firstName", firstNameMsg)}
            className={fieldClass("firstName", firstNameMsg)}
          />
        </div>
        <div>
          <LabelRow
            htmlFor="lastName"
            label={tr("Last name")}
            error={lastNameMsg && tr(lastNameMsg)}
          />
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onBlur={touch("lastName")}
            {...a11y("lastName", lastNameMsg)}
            className={fieldClass("lastName", lastNameMsg)}
          />
        </div>
      </div>

      <div>
        <LabelRow
          htmlFor="email"
          label={tr("Email")}
          error={emailMsg && tr(emailMsg)}
        />
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={touch("email")}
          {...a11y("email", emailMsg)}
          className={fieldClass("email", emailMsg)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <LabelRow
            htmlFor="password"
            label={tr("Password")}
            error={passwordMsg && tr(passwordMsg)}
            warning={keyboardWarning ? tr("Thai keyboard on?") : null}
          />
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={touch("password")}
              {...a11y("password", passwordMsg)}
              className={fieldClass("password", passwordMsg)}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-navy"
              aria-label={showPassword ? tr("Hide password") : tr("Show password")}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {password.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <RuleRow
                ok={rules.length}
                flagged={!!passwordMsg}
                label={tr("At least 8 characters")}
              />
              <RuleRow
                ok={rules.letter}
                flagged={!!passwordMsg}
                label={tr("Contains a letter")}
              />
              <RuleRow
                ok={rules.number}
                flagged={!!passwordMsg}
                label={tr("Contains a number")}
              />
            </ul>
          )}
        </div>

        <div>
          <LabelRow
            htmlFor="confirmPassword"
            label={tr("Confirm password")}
            error={confirmMsg && tr(confirmMsg)}
          />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={touch("confirmPassword")}
            {...a11y("confirmPassword", confirmMsg)}
            className={`w-full px-4 py-3 border bg-white text-ink focus:outline-none ${
              passwordsMismatch || confirmMsg
                ? "border-danger-line focus:border-danger-ink"
                : passwordsMatch
                  ? "border-line focus:border-line"
                  : "border-line focus:border-navy"
            }`}
          />
          {passwordsMatch && (
            <p className="text-xs text-gold-ink mt-2 inline-flex items-center gap-1.5">
              <Check className="w-3 h-3" /> {tr("Passwords match")}
            </p>
          )}
          {passwordsMismatch && (
            <p className="text-xs text-danger-ink mt-2 inline-flex items-center gap-1.5">
              <X className="w-3 h-3" /> {tr("Passwords don’t match")}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {tr(state.error)}
        </div>
      )}

      <Button type="submit" size="lg" fullWidth disabled={isPending}>
        {isPending ? tr("Creating account…") : tr("Continue")}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  );
}

/**
 * A field's label with its message on the SAME row, right-aligned. Not under
 * the field: the sign-up card has to fit one screen with no scrolling at
 * 930x600 with the password rules showing, and there is ~52px to spare, so a
 * message must not add height (2026-11-13). The error span is the input's
 * aria-describedby target (`{htmlFor}-error`). A warning (the password's
 * "Thai keyboard on?") is navy + weight, never danger: it does not block.
 */
function LabelRow({
  htmlFor,
  label,
  error,
  warning,
}: {
  htmlFor: Field;
  label: string;
  error: string | null;
  warning?: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
      >
        {label}
      </label>
      {error ? (
        <span id={`${htmlFor}-error`} className="text-xs text-danger-ink text-right">
          {error}
        </span>
      ) : warning ? (
        <span className="text-xs text-navy font-medium text-right">{warning}</span>
      ) : null}
    </div>
  );
}

/** One password rule. `flagged` (the field has been left or submitted while
 *  failing) turns an UNMET rule red, so the reader sees which one to fix. */
function RuleRow({
  ok,
  flagged = false,
  label,
}: {
  ok: boolean;
  flagged?: boolean;
  label: string;
}) {
  return (
    <li
      className={`inline-flex items-center gap-2 ${
        ok ? "text-gold-ink" : flagged ? "text-danger-ink" : "text-ink-muted"
      }`}
    >
      {ok ? (
        <Check className="w-3 h-3 shrink-0" />
      ) : (
        <span className="w-3 h-3 inline-block rounded-full border border-current shrink-0" />
      )}
      <span>{label}</span>
    </li>
  );
}
