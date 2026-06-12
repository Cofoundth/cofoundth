"use client";

import Link from "next/link";
import { Fragment } from "react";

// Linkify #hashtags inside free text (post bodies + comments) into clickable
// links to the community search. Thai-aware: tone/vowel marks are \p{M}.
// A hashtag must be preceded by start-of-string or a non-tag character so we
// don't match inside words or URLs.
export function TagText({ text }: { text: string }) {
  // Built fresh per render so the stateful `lastIndex` isn't shared module
  // state mutated during render.
  const tagRe =
    /(^|[^\p{L}\p{N}\p{M}_/])#([\p{L}\p{N}\p{M}]+(?:-[\p{L}\p{N}\p{M}]+)*)/gu;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(text)) !== null) {
    const [full, pre, tag] = m;
    const start = m.index;
    const before = text.slice(last, start) + pre;
    if (before) nodes.push(<Fragment key={key++}>{before}</Fragment>);
    nodes.push(
      <Link
        key={key++}
        href={`/community?q=${encodeURIComponent(tag)}`}
        className="text-navy hover:text-gold"
      >
        #{tag}
      </Link>,
    );
    last = start + full.length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }

  return <>{nodes}</>;
}
