"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { createPostAction, type PostState } from "./actions";

const INITIAL: PostState = null;

export function PostComposer() {
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
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          autoFocus
          placeholder="Ask a question, share a milestone, request feedback…"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          Content
        </label>
        <textarea
          id="content"
          name="content"
          required
          maxLength={5000}
          rows={10}
          placeholder="Markdown welcome. Be specific — better questions get better answers."
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-y"
        />
      </div>

      <div>
        <label
          htmlFor="tags"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          Tags <span className="normal-case tracking-normal text-ink-muted">(up to 5, comma or space separated)</span>
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          maxLength={200}
          placeholder="fundraising, sales, hiring, thai-market"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
        <p className="text-xs text-ink-muted mt-2">
          Lowercase letters, digits, and hyphens only. Helps others find your post.
        </p>
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="pt-4 border-t border-line flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-8 py-4 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2"
        >
          {isPending ? "Publishing…" : "Publish post"}
          {!isPending && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </form>
  );
}
