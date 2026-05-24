"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { createCommentAction, type CommentState } from "./actions";

const INITIAL: CommentState = null;

export function CommentComposer({ postId }: { postId: string }) {
  const action = createCommentAction.bind(null, postId);
  const [state, formAction, isPending] = useActionState<CommentState, FormData>(
    action,
    INITIAL,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending && !state?.error && formRef.current) {
      formRef.current.reset();
    }
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <textarea
        name="content"
        rows={3}
        maxLength={2000}
        required
        placeholder="Add your comment…"
        className="w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-y"
      />
      {state?.error && (
        <div className="text-xs text-red-700">{state.error}</div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide inline-flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
