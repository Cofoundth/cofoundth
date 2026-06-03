"use client";

import Link from "next/link";
import { Fragment } from "react";

// Linkify #hashtags (→ community search) and @mentions (→ profile) in comment
// text. Mentions resolve against a {firstNameLower: profileHref} map built from
// the thread's participants; an @name with no match renders as plain text.
// Thai-aware (\p{M} = tone/vowel marks).
const RE =
  /(^|[^\p{L}\p{N}\p{M}_/])([#@])([\p{L}\p{N}\p{M}]+(?:-[\p{L}\p{N}\p{M}]+)*)/gu;

export function CommentText({
  text,
  mentions,
}: {
  text: string;
  mentions?: Record<string, string>;
}) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;

  while ((m = RE.exec(text)) !== null) {
    const [full, pre, sigil, word] = m;
    const start = m.index;
    const before = text.slice(last, start) + pre;
    if (before) nodes.push(<Fragment key={key++}>{before}</Fragment>);

    if (sigil === "#") {
      nodes.push(
        <Link
          key={key++}
          href={`/community?q=${encodeURIComponent(word)}`}
          className="text-navy hover:text-gold"
        >
          #{word}
        </Link>,
      );
    } else {
      const href = mentions?.[word.toLowerCase()];
      nodes.push(
        href ? (
          <Link
            key={key++}
            href={href}
            className="text-navy font-medium hover:text-gold"
          >
            @{word}
          </Link>
        ) : (
          <Fragment key={key++}>@{word}</Fragment>
        ),
      );
    }
    last = start + full.length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }

  return <>{nodes}</>;
}
