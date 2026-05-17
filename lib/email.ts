// Transactional emails via Resend.
//
// Requires RESEND_API_KEY env var. If unset, sends are silently skipped so
// the rest of the app keeps working during development.

import { Resend } from "resend";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "CoFound.th <onboarding@resend.dev>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

type SendOptions = {
  to: string;
  subject: string;
  html: string;
};

async function send({ to, subject, html }: SendOptions) {
  const c = client();
  if (!c) {
    // Dev: log instead of sending
    console.log(`[email skipped — no RESEND_API_KEY] to=${to} subject=${subject}`);
    return;
  }
  try {
    await c.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email send failed]", err);
  }
}

// ---- Templates ------------------------------------------------------

const BASE_STYLES = `
  body { background: #FAFAF7; color: #4A4A4A; font-family: system-ui, -apple-system, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
  .card { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 32px; }
  h1 { font-family: Georgia, serif; color: #0A1F44; font-size: 28px; margin: 0 0 16px; }
  .gold { color: #B8941F; }
  .badge { display: inline-block; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #B8941F; margin-bottom: 16px; }
  .button { display: inline-block; background: #0A1F44; color: #FFFFFF !important; padding: 14px 28px; text-decoration: none; font-size: 14px; letter-spacing: 0.05em; margin-top: 24px; }
  .note { padding: 16px; background: #FAFAF7; border-left: 2px solid #B8941F; margin: 20px 0; font-style: italic; color: #4A4A4A; }
  .footer { text-align: center; font-size: 11px; color: #888; margin-top: 32px; }
`;

function wrap(title: string, body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title><style>${BASE_STYLES}</style></head>
<body><div class="container"><div class="card">${body}</div>
<div class="footer">CoFound.th — Built by founders, for founders.</div></div></body></html>`;
}

export async function sendInterestReceivedEmail(opts: {
  toEmail: string;
  toName: string;
  fromName: string;
  note: string | null;
}) {
  const body = `
    <div class="badge">New on CoFound.th</div>
    <h1>${escapeHtml(opts.fromName)} expressed interest</h1>
    <p>Hi ${escapeHtml(opts.toName)},</p>
    <p><strong>${escapeHtml(opts.fromName)}</strong> just expressed interest in your profile.</p>
    ${
      opts.note
        ? `<div class="note">"${escapeHtml(opts.note)}"</div>`
        : ""
    }
    <p>Review their profile and, if you&rsquo;re also interested, express interest back — messaging unlocks on mutual interest.</p>
    <a href="${SITE_URL}/interests" class="button">View interest</a>
  `;
  return send({
    to: opts.toEmail,
    subject: `${opts.fromName} expressed interest in your profile`,
    html: wrap("New interest on CoFound.th", body),
  });
}

export async function sendMutualMatchEmail(opts: {
  toEmail: string;
  toName: string;
  otherName: string;
  matchId: string;
}) {
  const body = `
    <div class="badge">Mutual interest unlocked</div>
    <h1>You and ${escapeHtml(opts.otherName)} matched</h1>
    <p>Hi ${escapeHtml(opts.toName)},</p>
    <p>You and <strong>${escapeHtml(opts.otherName)}</strong> both expressed interest. Messaging is now unlocked.</p>
    <p>This is a serious decision &mdash; take time to read their full profile, prepare thoughtful questions, and have a real conversation before committing.</p>
    <a href="${SITE_URL}/messages/${opts.matchId}" class="button">Open conversation</a>
  `;
  return send({
    to: opts.toEmail,
    subject: `You and ${opts.otherName} are a mutual match`,
    html: wrap("Mutual match on CoFound.th", body),
  });
}

export async function sendNewMessageEmail(opts: {
  toEmail: string;
  toName: string;
  fromName: string;
  matchId: string;
  preview: string;
}) {
  const body = `
    <div class="badge">New message</div>
    <h1>${escapeHtml(opts.fromName)} sent you a message</h1>
    <p>Hi ${escapeHtml(opts.toName)},</p>
    <div class="note">"${escapeHtml(opts.preview.slice(0, 200))}${opts.preview.length > 200 ? "..." : ""}"</div>
    <a href="${SITE_URL}/messages/${opts.matchId}" class="button">Reply</a>
  `;
  return send({
    to: opts.toEmail,
    subject: `New message from ${opts.fromName}`,
    html: wrap("New message on CoFound.th", body),
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
