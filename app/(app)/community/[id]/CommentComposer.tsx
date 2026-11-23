"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  reply,
}: {
  postId: string;
  centerText?: boolean;
  reply?: { id: string; name: string; onCancel: () => void; onPosted: () => void };
}) {
  const tr = useT();
  const [draft, setDraft] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const replyingTo = reply?.id;
  const label = reply
    ? tr("Reply to {name}").replace("{name}", () => reply.name)
    : tr("Add your comment…");

  useEffect(() => {
    if (replyingTo) fieldRef.current?.focus();
  }, [replyingTo]);

  const [state, formAction, isPending] = useActionState<PostFormState, FormData>(
    async (prev, formData) => {
      // A request that fails IN TRANSIT (offline, a deploy mid-session)
      // rejects, and useActionState would rethrow it into app/error.tsx —
      // the page and the draft gone. Said like any other refusal instead.
      try {
        const result = await createPostCommentAction(postId, prev, formData);
        if (!result?.error) {
          setDraft("");
          reply?.onPosted();
        }
        return result;
      } catch {
        return { error: "Couldn't post comment. Try again." };
      }
    },
    INITIAL,
  );

  return (
    <form
      action={formAction}
      className="space-y-3"
      aria-label={reply ? label : undefined}
      onKeyDown={(event) => {
        if (reply && !isPending && event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.stopPropagation();
          reply.onCancel();
        }
      }}
    >
      {reply && <input type="hidden" name="parent_comment_id" value={reply.id} />}
      <textarea
        ref={fieldRef}
        name="content"
        rows={3}
        maxLength={2000}
        required
        readOnly={isPending}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={label}
        placeholder={tr(reply ? "Write a reply…" : "Add your comment…")}
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
      <div className="flex flex-wrap justify-end gap-2">
        {reply && (
          <Button variant="ghost" className="min-h-11" disabled={isPending} onClick={reply.onCancel}>
            {tr("Cancel")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || (reply !== undefined && draft.trim().length === 0)}
          className="min-h-11 px-5 py-2.5"
        >
          <Send className="w-4 h-4" />
          {isPending ? tr("Posting…") : tr(reply ? "Post reply" : "Comment")}
        </Button>
      </div>
    </form>
  );
}
