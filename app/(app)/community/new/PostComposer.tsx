"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { createPostAction, type PostState } from "./actions";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

const INITIAL: PostState = null;

export function PostComposer() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<PostState, FormData>(
    createPostAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="title"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Title")}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          autoFocus
          placeholder={tr("Ask a question, share a milestone, request feedback…")}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Content")}
        </label>
        <textarea
          id="content"
          name="content"
          required
          maxLength={5000}
          rows={10}
          placeholder={tr("Markdown welcome. Be specific — better questions get better answers.")}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-y rounded-xl"
        />
      </div>

      <div>
        <label
          htmlFor="tags"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Tags")}
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          maxLength={200}
          aria-describedby="post-tags-hint"
          placeholder={tr("fundraising, sales, hiring, thai-market")}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
        />
        <p id="post-tags-hint" className="text-xs text-ink-muted mt-2">
          {tr("Add up to 5 tags separated by commas or spaces. Use letters, numbers, or hyphens.")}
        </p>
      </div>

      {state?.error && (
        <div role="alert" className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {state.invalidTag
            ? tr(state.error).replace("{tag}", () => state.invalidTag ?? "")
            : tr(state.error)}
        </div>
      )}

      <div className="pt-4 border-t border-line flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {tr(isPending ? "Publishing…" : "Publish post")}
          {!isPending && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </form>
  );
}
