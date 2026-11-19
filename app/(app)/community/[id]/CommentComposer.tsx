"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import { createPostCommentAction, type PostFormState } from "@/lib/post-actions";
import { useT } from "@/lib/i18n-client";
import { Button, cn } from "@/components/ui";

const INITIAL: PostFormState = null;

// The comment box under a thread and under a product.
//
// The draft is CONTROLLED, and that is the point of it: React resets a form
// after every action it runs, success or refusal, and an uncontrolled textarea
// went blank with it — so a refused comment ("You're commenting very fast…
// try again", migration 0083) took what the member had typed with it. A
// controlled value survives the reset; the action below clears it only when
// the comment really posted.
export function CommentComposer({
  postId,
  centerText = false,
}: {
  postId: string;
  centerText?: boolean;
}) {
  const tr = useT();
  const [draft, setDraft] = useState("");
  const [state, formAction, isPending] = useActionState<PostFormState, FormData>(
    async (prev, formData) => {
      // A request that fails IN TRANSIT (offline, a deploy mid-session)
      // rejects, and useActionState would rethrow it into app/error.tsx —
      // the page and the draft gone. Said like any other refusal instead.
      try {
        const result = await createPostCommentAction(postId, prev, formData);
        if (!result?.error) setDraft("");
        return result;
      } catch {
        return { error: "Couldn't post comment. Try again." };
      }
    },
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="content"
        rows={3}
        maxLength={2000}
        required
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={tr("Add your comment…")}
        placeholder={tr("Add your comment…")}
        className={cn(
          "w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-y rounded-xl",
          // Keep the three-row height while centering the one-line placeholder.
          centerText && "h-[calc(3lh+1.5rem+2px)] text-center placeholder-shown:py-[calc(1lh+0.75rem)]",
        )}
      />
      {state?.error && (
        // Server actions return English literals; the client translates them.
        <div className="text-xs text-danger-ink" role="alert">
          {tr(state.error)}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5"
        >
          <Send className="w-4 h-4" />
          {isPending ? tr("Posting…") : tr("Comment")}
        </Button>
      </div>
    </form>
  );
}
