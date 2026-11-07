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
import {
  CATEGORY_LABEL,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/post-types";
import { useT } from "@/lib/i18n-client";
import { Button, Input, ToggleChip, cardClasses } from "@/components/ui";

const INITIAL: PostFormState = null;

type Kind = "post" | "milestone" | "show_and_tell";

const KIND_OPTIONS: { value: Kind; en: string; icon: typeof Sparkles }[] = [
  { value: "post", en: "Post", icon: Sparkles },
  { value: "milestone", en: "Milestone", icon: Trophy },
  { value: "show_and_tell", en: "Show & tell", icon: Rocket },
];

// Chip labels for the controlled category slugs. The SLUG is what ships (it is
// stored as an ordinary lowercase tag and queried with `.overlaps`); this map
// exists so the chip reads "App" rather than "app", and so the visible word is
// a translation key — the slug itself must never be translated or the query
// stops matching.
//
// DUPLICATE, KNOWN: app/(app)/products/categories.ts holds the identical map as
// CATEGORY_LABEL and calls itself the ONE place a slug gets a human label. It
// is right, and this is copy number two. Not imported from there on purpose:
// that module is route-local, and the composer renders on /community and
// /dashboard, so a shared component would be reaching into one route's private
// folder. The fix is to lift ONE map into lib/ beside PRODUCT_CATEGORIES and
// have both read it — a file neither of these two changes owns. Do that before
// a third copy appears; six entries diverge quietly.
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
  const [category, setCategory] = useState<ProductCategory | null>(null);
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
      // form.reset() only clears the DOM; the category lives in React state
      // and would survive into the next post otherwise.
      setCategory(null);
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

  // "Show & tell" IS the product record: a name, a description, a link out, and
  // one category. Nothing about this surface hosts or embeds anything — the
  // link is the whole point — so the link is required for this kind and
  // optional for every other.
  const isProduct = kind === "show_and_tell";

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
      className={cardClasses({ padding: "xs" })}
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

      {/* The product fields are ALWAYS visible for this kind instead of hiding
          behind the Title/Link toggles (which are themselves hidden for it
          below): a requirement the user has to go looking for is a requirement
          they discover as a server error. `required` is the browser's own
          check and saves the round-trip — the server validates independently
          and remains the real gate. Exactly one input named `title` and one
          named `link_url` is mounted at a time, because formData.get() returns
          only the FIRST field of a given name.

          Carrying bg-cream + rounded-xl so the labelled field matches the
          composer's own fields, which sit on cream inside a white card; the
          Input primitive defaults to bg-white, for forms on a cream page. */}
      {isProduct ? (
        <Input
          id="product-name"
          name="title"
          type="text"
          required
          maxLength={200}
          fieldSize="sm"
          label={tr("Product name")}
          className="bg-cream rounded-xl"
          containerClassName="mb-3"
        />
      ) : (
        showTitle && (
          <input
            name="title"
            type="text"
            maxLength={200}
            placeholder={tr("Add a title (optional)")}
            className="mb-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
          />
        )
      )}

      <textarea
        name="content"
        rows={3}
        // Must match the 5000 the counter above enforces — the old 5200 let the
        // browser accept 200 chars the submit button had already disabled.
        maxLength={5000}
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy resize-none rounded-xl"
      />

      {isProduct ? (
        <Input
          id="product-link"
          name="link_url"
          type="url"
          required
          placeholder="https://"
          fieldSize="sm"
          label={tr("Link to try it")}
          className="bg-cream rounded-xl"
          containerClassName="mt-3"
        />
      ) : (
        showLink && (
          <input
            name="link_url"
            type="url"
            placeholder="https://"
            className="mt-2 w-full px-3 py-2 border border-line bg-cream text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
          />
        )
      )}

      {isProduct && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            {/* The app's form-FIELD label idiom, not <Eyebrow> — different
                role, and Eyebrow's 0.25em tracking belongs to section
                eyebrows. */}
            <span className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
              {tr("Category")}
            </span>
            {!category && (
              <span className="text-xs text-ink-muted">{tr("Pick one")}</span>
            )}
          </div>
          <div
            role="group"
            aria-label={tr("Category")}
            className="flex items-center gap-2 flex-wrap"
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <ToggleChip
                key={c}
                selected={category === c}
                size="xs"
                onClick={() => setCategory(c)}
              >
                {tr(CATEGORY_LABEL[c])}
              </ToggleChip>
            ))}
          </div>
          {/* The category rides in `tags` as an ordinary lowercase tag. A tag
              is reversible and ships today; a column is a migration against a
              database that is also production, and this surface may yet be
              thrown away. If it proves itself, the column earns itself then.

              For THIS kind the category is the only `tags` value — the free
              text Tags toggle is hidden below — which is deliberate twice
              over: formData.get("tags") would silently read only the first of
              two same-named inputs, and parseTags() slices to five tags, so a
              category appended after five typed tags would vanish without a
              word. Nothing filters on free tags here anyway; the one
              controlled slug is what the grid queries. */}
          <input type="hidden" name="tags" value={category ?? ""} />
        </div>
      )}

      {showTags && !isProduct && (
        <input
          name="tags"
          type="text"
          maxLength={200}
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
        // Without tr() four EXISTING errors that already have Thai in
        // translations.json ("Max image size is 5MB.", the upload-type one,
        // "Not authenticated.", "Only founders can post in the community.")
        // have never once rendered in Thai.
        <div className="mt-2 text-xs text-danger-ink">{tr(state.error)}</div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* Hidden for the product kind only: all three of these fields are
              either already on screen (title, link) or replaced by the
              category chips (tags), so leaving the toggles would offer to
              hide a required field and to add a second `tags` input. The
              other two kinds are untouched. */}
          {!isProduct && (
            <>
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
            </>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={toggleCls(!!imagePreview)}
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
        {/* The category is chips, not an input, so the browser cannot enforce
            it: a hidden field is barred from constraint validation. Gating the
            submit is the enforcement, and the "Pick one" note next to the
            Category label is what makes a disabled button legible. */}
        <Button
          type="submit"
          size="sm"
          disabled={
            isPending ||
            tooLong ||
            content.trim().length === 0 ||
            (isProduct && !category)
          }
        >
          <Send className="w-3.5 h-3.5" />
          {isPending ? tr("Posting…") : tr("Post")}
        </Button>
      </div>
    </form>
  );
}
