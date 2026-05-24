"use client";

import { useEffect } from "react";
import { markConversationRead } from "./actions";

// Fires the read-receipt once on mount. Lives client-side so Next.js
// link prefetch (which doesn't execute client effects) can't accidentally
// mark messages read before the user opens the conversation.
export function ReadOnMount({ matchId }: { matchId: string }) {
  useEffect(() => {
    void markConversationRead(matchId);
  }, [matchId]);
  return null;
}
