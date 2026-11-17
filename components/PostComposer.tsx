"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Link2,
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
import { MAX_UPLOAD_IMAGE_BYTES, POST_IMAGE_TYPES } from "@/lib/post-types";
import { downscaleImage } from "@/lib/downscale-image";
import { useT } from "@/lib/i18n-client";
import { Button, ToggleChip, cardClasses } from "@/components/ui";

const INITIAL: PostFormState = null;

// lib/post-actions.ts is still the real gate on the type (IMG_EXT there). The
// `accept` attribute is built from the shared list rather than hand-typed
// beside it — it is only a HINT to the file dialog, but a hint that agrees
// with the server.
const ACCEPT_ATTR = POST_IMAGE_TYPES.join(",");

// TWO KINDS, AND NO PRODUCT. This composer used to offer a third tab, "Show &
// tell", which was the only way to put something on the /products shelf — so
// adding a product ANNOUNCED it to the whole community feed whether the maker
// wanted that or not. The founder decided otherwise (CLAUDE.md, Language Rules):
// a product is added QUIETLY on its own page, app/(app)/products/new, and
// appears on the deck and its own page only. Announcing it is the maker's
// choice, by writing a normal post here. createPostAction refuses
// kind='show_and_tell' for the same reason, so the tab cannot come back by
// accident; the several-screenshot picker that only products used moved to
// components/ScreenshotPicker.tsx with them.
type Kind = "post" | "milestone";

const KIND_OPTIONS: { value: Kind; en: string; icon: typeof Sparkles }[] = [
  { value: "post", en: "Post", icon: Sparkles },
  { value: "milestone", en: "Milestone", icon: Trophy },
];

const BODY_LIMIT = 5000;

export function PostComposer() {
  const tr = useT();
  // A request that fails IN TRANSIT — offline, a deploy mid-session, a body
  // the platform refuses — rejects instead of returning a refusal, and
  // useActionState rethrows a rejection into app/error.tsx: the whole page,
  // and everything typed into this form, gone. Caught here and said like any
  // other refusal, so the draft (all of it in state, below) stays.
  const [state, formAction, isPending] = useActionState<
    PostFormState,
    FormData
  >(async (prev, formData) => {
    try {
      return await createPostAction(prev, formData);
    } catch {
      return { error: "Couldn't post. Try again." };
    }
  }, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<Kind>("post");
  const [content, setContent] = useState("");
  // EVERY field is controlled, and the picked photo is kept in state. React
  // resets a form after each action it runs — a refusal included ("You can
  // post up to 10 times an hour…", migration 0083) — and an uncontrolled field
  // went blank with it. Worse, the file input emptied while its preview stayed
  // on screen, so a retry posted WITHOUT the photo the member could still see.
  // State survives the reset; the success effect below is what clears it.
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // While a picked photo is being shrunk (onFile), Post waits for it.
  const [preparing, setPreparing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [showTitle, setShowTitle] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showTags, setShowTags] = useState(false);

  // The single cover a post or a milestone may carry.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // The preview's object URL, as a ref the unmount cleanup can read: an object
  // URL is held by the document until it is revoked, so navigating away with a
  // photo picked left it pinned in memory. Revoked on re-pick, on remove, after
  // a successful post and on unmount.
  const liveUrl = useRef<string | null>(null);
  function setPreview(next: string | null) {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    liveUrl.current = next;
    setImagePreview(next);
  }
  useEffect(
    () => () => {
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
      liveUrl.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!isPending && !state?.error && formRef.current) {
      formRef.current.reset();
      setContent("");
      setTitle("");
      setLink("");
      setTags("");
      setFile(null);
      setKind("post");
      setShowTitle(false);
      setShowLink(false);
      setShowTags(false);
      // Revoking twice under StrictMode is a no-op, and the ref is cleared on
      // the first call, so the second does nothing.
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
      liveUrl.current = null;
      setImagePreview(null);
    }
  }, [isPending, state]);

  // The photo is SHRUNK in the browser before it is kept (lib/downscale-image,
  // as the product picker and the avatar uploader already do). This used to
  // send the original bytes on the theory that one image fits the action's
  // body limit — but a phone photo is routinely over Vercel's ~4.5MB request
  // limit, and a body over the limit is refused before createPostAction runs,
  // so the request failed in transit and took the page down with it. If even
  // the shrunk file is over MAX_UPLOAD_IMAGE_BYTES (an animated GIF is never
  // re-encoded), it is refused here, by name of the problem, before sending.
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setPickError(null);
    if (!picked) {
      setFile(null);
      setPreview(null);
      return;
    }
    setPreparing(true);
    let ready = picked;
    try {
      ready = (await downscaleImage(picked)).file;
    } finally {
      setPreparing(false);
    }
    if (ready.size > MAX_UPLOAD_IMAGE_BYTES) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      setPreview(null);
      setPickError("That image is too large. Pick one under 4MB.");
      return;
    }
    setFile(ready);
    setPreview(URL.createObjectURL(ready));
  }
  function removeImage() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFile(null);
    setPickError(null);
    setPreview(null);
  }

  // The photo goes in from STATE, not from the input: after a refusal React's
  // form reset has emptied the input, but `file` still holds what the preview
  // shows (see the state above).
  function submit(formData: FormData) {
    formData.delete("image");
    if (file) formData.set("image", file);
    formAction(formData);
  }

  const remaining = BODY_LIMIT - content.length;
  const tooLong = remaining < 0;

  const toggleCls = (on: boolean) =>
    `inline-flex items-center gap-1 transition-colors ${
      on ? "text-navy" : "text-ink-muted hover:text-navy"
    }`;

  const placeholder =
    kind === "milestone"
      ? tr("What did you just hit? (revenue, customers, fundraise…)")
      : tr("What are you working on?");

  return (
    <form
      ref={formRef}
      action={submit}
      className={cardClasses({ padding: "xs" })}
    >
      <input type="hidden" name="kind" value={kind} />
      <input
        ref={fileInputRef}
        type="file"
        name="image"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={onFile}
      />

      {/* Kind tabs */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {KIND_OPTIONS.map((k) => {
          const Icon = k.icon;
          const active = kind === k.value;
          return (
            <ToggleChip
              key={k.value}
              selected={active}
              size="xs"
              onClick={() => setKind(k.value)}
            >
              <Icon className="w-3 h-3" strokeWidth={1.5} />
              {tr(k.en)}
            </ToggleChip>
          );
        })}
      </div>

      {showTitle && (
        <input
          name="title"
          type="text"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr("Add a title (optional)")}
          className="mb-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
        />
      )}

      <textarea
        name="content"
        rows={3}
        // Must match the counter below — an attribute looser than the counter
        // lets the browser accept characters the submit button has already
        // disabled itself over.
        maxLength={BODY_LIMIT}
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy resize-none rounded-xl"
      />

      {showLink && (
        <input
          name="link_url"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://"
          className="mt-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
        />
      )}

      {showTags && (
        <input
          name="tags"
          type="text"
          maxLength={200}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={tr("tags: fundraising, hiring, thai-market")}
          className="mt-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
        />
      )}

      {imagePreview && (
        <div className="mt-2 relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt=""
            className="max-h-48 w-auto border border-line rounded-xl"
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
        // Server actions return English literals; the CLIENT pairs them.
        // Without tr() the EXISTING errors that already have Thai in
        // translations.json ("Max image size is 5MB.", the upload-type one,
        // "Not authenticated.", "Only founders can post in the community.")
        // would never render in Thai.
        <div role="alert" className="mt-2 text-xs text-danger-ink">
          {tr(state.error)}
        </div>
      )}
      {pickError && (
        <div role="alert" className="mt-2 text-xs text-danger-ink">
          {tr(pickError)}
        </div>
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
            // Not while a photo is still being shrunk: a second pick would
            // race the first, and the slower one would win.
            disabled={preparing}
            className={`${toggleCls(!!imagePreview)} disabled:opacity-60`}
          >
            <ImagePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            {tr("Photo")}
          </button>
          {remaining < 500 && (
            <span
              className={`tabular-nums ${tooLong ? "text-danger-ink" : "text-ink-muted"}`}
            >
              {remaining}
            </span>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={
            isPending || preparing || tooLong || content.trim().length === 0
          }
        >
          <Send className="w-3.5 h-3.5" />
          {isPending ? tr("Posting…") : tr("Post")}
        </Button>
      </div>
    </form>
  );
}
