import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostComposer } from "./PostComposer";

export default function NewPostPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-[88px]">
      <Link
        href="/community"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to community
      </Link>

      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
          Community
        </div>
        <h1 className="text-d2 mb-2">New post</h1>
        <p className="text-ink-muted">
          Share what you&rsquo;re building, ask a question, or request feedback.
        </p>
      </div>

      <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-xs">
        <PostComposer />
      </div>
    </div>
  );
}
