"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Link2,
  Rocket,
  Send,
  Sparkles,
  Tag,
  Trophy,
  Type,
  X,
} from "lucide-react";
import {
  createPostAction,
  type PostFormState,
} from "@/lib/post-actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: PostFormState = null;

type Kind = "post" | "milestone" | "show_and_tell";

const KIND_OPTIONS: { value: Kind; en: string; icon: typeof Sparkles }[] = [
  { value: "post", en: "Post", icon: Sparkles },
  { value: "milestone", en: "Milestone", icon: Trophy },
  { value: "show_and_tell", en: "Show & tell", icon: Rocket },
];

export function PostComposer() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    PostFormState,
    FormData
  >(createPostAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<Kind>("post");
  const [content, setContent] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !state?.error && formRef.current) {
      formRef.current.reset();
      setContent("");
      setKind("post");
      setShowTitle(false);
      setShowLink(false);
      setShowTags(false);
      setImagePreview(null);
    }
  }, [isPending, state]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setImagePreview(f ? URL.createObjectURL(f) : null);
  }
  function removeImage() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImagePreview(null);
  }

  const remaining = 5000 - content.length;
  const tooLong = remaining < 0;

  const toggleCls = (on: boolean) =>
    `inline-flex items-center gap-1 transition-colors ${
      on ? "text-navy" : "text-ink-muted hover:text-navy"
    }`;

  const placeholder =
    kind === "milestone"
      ? tr("What did you just hit? (revenue, customers, fundraise…)")
      : kind === "show_and_tell"
        ? tr("What did you just ship?")
        : tr("What are you working on?");

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-white border border-line p-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <input
        ref={fileInputRef}
        type="file"
        name="image"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onFile}
      />

      {/* Kind tabs */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {KIND_OPTIONS.map((k) => {
          const Icon = k.icon;
          const active = kind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs tracking-wide border transition-colors ${
                active
                  ? "bg-navy border-navy text-white"
                  : "bg-white border-line text-ink hover:border-navy"
              }`}
            >
              <Icon className="w-3 h-3" strokeWidth={1.5} />
              {tr(k.en)}
            </button>
          );
        })}
      </div>

      {showTitle && (
        <input
          name="title"
          type="text"
          maxLength={200}
          placeholder={tr("Add a title (optional)")}
          className="mb-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy"
        />
      )}

      <textarea
        name="content"
        rows={3}
        maxLength={5200}
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy resize-none"
      />

      {showLink && (
        <input
          name="link_url"
          type="url"
          placeholder="https://"
          className="mt-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy"
        />
      )}

      {showTags && (
        <input
          name="tags"
          type="text"
          maxLength={200}
          placeholder={tr("tags: fundraising, hiring, thai-market")}
          className="mt-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy"
        />
      )}

      {imagePreview && (
        <div className="mt-2 relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt=""
            className="max-h-48 w-auto border border-line"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-1 right-1 bg-navy/80 hover:bg-navy text-white p-1"
            aria-label={tr("Remove")}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {state?.error && (
        <div className="mt-2 text-xs text-red-700">{state.error}</div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setShowTitle((v) => !v)}
            className={toggleCls(showTitle)}
          >
            <Type className="w-3.5 h-3.5" strokeWidth={1.5} />
            {tr("Title")}
          </button>
          <button
            type="button"
            onClick={() => setShowLink((v) => !v)}
            className={toggleCls(showLink)}
          >
            <Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            {tr("Link")}
          </button>
          <button
            type="button"
            onClick={() => setShowTags((v) => !v)}
            className={toggleCls(showTags)}
          >
            <Tag className="w-3.5 h-3.5" strokeWidth={1.5} />
            {tr("Tags")}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={toggleCls(!!imagePreview)}
          >
            <ImagePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            {tr("Photo")}
          </button>
          <span
            className={`tabular-nums ${tooLong ? "text-red-700" : "text-ink-muted"}`}
          >
            {remaining}
          </span>
        </div>
        <button
          type="submit"
          disabled={isPending || tooLong || content.trim().length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm tracking-wide"
        >
          <Send className="w-3.5 h-3.5" />
          {isPending ? tr("Posting…") : tr("Post")}
        </button>
      </div>
    </form>
  );
}
