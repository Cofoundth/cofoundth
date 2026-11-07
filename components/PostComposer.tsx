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
  MAX_PRODUCT_IMAGES,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/post-types";
import { useT } from "@/lib/i18n-client";
import { downscaleImage } from "@/lib/downscale-image";
import {
  Button,
  CardChip,
  Input,
  ToggleChip,
  cardClasses,
} from "@/components/ui";

const INITIAL: PostFormState = null;

// Mirrors MAX_IMG_BYTES in lib/post-actions.ts. NOT imported from there, and
// not a shortcut: that module carries "use server", and a "use server" file is
// only allowed to export async functions — a number cannot cross that boundary
// at all. The honest shared home is lib/post-types.ts, beside
// MAX_PRODUCT_IMAGES, which is already the client-safe half of this contract;
// move it there the next time that file is open. Until then the server stays
// the real gate and this is only what keeps a doomed upload off the wire.
//
// ITS ROLE NARROWED when the downscaler landed: for screenshots this is now
// checked on the DOWNSCALED file, not the picked one, so a 12MB phone photo
// is simply accepted at ~300KB instead of being bounced. What it still catches
// is the file the downscaler could not shrink — an undecodable PNG, a HEIC the
// browser cannot read, an animated GIF — which is exactly the set the server
// would have rejected a whole upload later.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// THE BACKSTOP THE PER-FILE CAPS NEVER HAD: what the screenshots may add up
// to, TOGETHER, enforced after downscaling.
//
// next.config.ts sets `experimental.serverActions.bodySizeLimit: "6mb"` and its
// comment records why that number: it was sized for ONE 5MB image plus
// multipart overhead, from the avatar work, when one image was all a post
// could carry. A product carries MAX_PRODUCT_IMAGES of them, so the maximum
// payload the per-file caps accept is 5 x 5MB = 25MB against a 6MB ceiling —
// and the framework rejects an oversized body BEFORE createPostAction runs, so
// not one of its per-file checks and not one line of its orphan cleanup
// executes. next.config.ts names the symptom: "An unexpected response was
// received from the server."
//
// 4MiB leaves ~2MiB of the 6MiB ceiling for the multipart boundaries, the
// 5000-character body, the title, the link, the tags and React's own action
// payload. That is deliberately loose — the downscaler below puts a 1600px
// screenshot at 150-400KB, so five of them land around 1-2MB and a maker never
// meets this limit in the normal case.
//
// IF bodySizeLimit MOVES, MOVE THIS, AND KEEP THE GAP. They are one contract
// split across two files, which is how they drifted in the first place.
const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024;

// Mirrors IMG_EXT in lib/post-actions.ts, which is still the real gate. The
// `accept` attribute is built from this list rather than hand-typed beside it,
// because `accept` is only a HINT to the file dialog — every desktop picker
// offers an "All files" escape and a drag-drop bypasses it entirely, so a
// picked .pdf arrives here routinely and used to cost a full upload round trip
// to be told so.
const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

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

  // The single cover for 'post' and 'milestone' — the common path, untouched.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Screenshots for 'show_and_tell'. REACT STATE is the source of truth here,
  // not the input's own FileList, and that is forced rather than chosen:
  //   1. a native <input multiple> REPLACES its FileList on every pick, so a
  //      second trip to the picker would silently drop the first batch — and
  //      picking five screenshots in one go from five different folders is not
  //      how anyone has them;
  //   2. a single thumbnail cannot be removed from a FileList at all without
  //      rebuilding one through DataTransfer.
  // So the input is only a PICKER and `submit()` below puts exactly what the
  // strip showed into the FormData, in the strip's order.
  const shotsInputRef = useRef<HTMLInputElement>(null);
  const [shots, setShots] = useState<{ file: File; url: string }[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  // True while the picked files are being downscaled. It gates BOTH buttons
  // below, and that is load-bearing twice over: posting mid-downscale would
  // submit a product with no screenshots at all, and a second pick starting
  // mid-downscale would read a stale `shots` when it totals up the bytes.
  const [preparing, setPreparing] = useState(false);

  // Every object URL this component has created and not yet revoked.
  //
  // A REF, not state: the unmount cleanup below has to see the latest set, and
  // an effect that depended on `shots` would re-run on every pick and revoke
  // the URLs the strip is still displaying. Nothing renders from this.
  const liveUrls = useRef<Set<string>>(new Set());

  function trackUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    liveUrls.current.add(url);
    return url;
  }
  function dropUrl(url: string | null) {
    if (!url) return;
    URL.revokeObjectURL(url);
    liveUrls.current.delete(url);
  }

  // THE UNMOUNT LEAK. Remove, clear and a successful post all revoked their
  // URLs already; navigating away in the middle did not, and an object URL is
  // held by the document until it is revoked or the document is destroyed — so
  // a maker who picked five screenshots and then clicked through to /products
  // left five decoded images pinned in memory. Empty deps on purpose: this
  // runs once, on unmount, and reads the ref.
  useEffect(
    () => () => {
      liveUrls.current.forEach((url) => URL.revokeObjectURL(url));
      liveUrls.current.clear();
    },
    [],
  );

  // "Show & tell" IS the product record: a name, a description, a link out, and
  // one category. Nothing about this surface hosts or embeds anything — the
  // link is the whole point — so the link is required for this kind and
  // optional for every other. It is also the only kind that takes more than
  // one image: /products leads with a screenshot gallery, and the other two
  // kinds are feed posts with a cover.
  const isProduct = kind === "show_and_tell";

  function clearShots() {
    setShots((prev) => {
      // Revoking inside the updater keeps this callable from the reset effect
      // below without putting `shots` in its dependency array — which would
      // re-run the effect on every pick and wipe the strip as it was filled.
      // A double invocation under StrictMode is harmless: revoking a URL twice
      // is a no-op, and nothing reads these again.
      prev.forEach((s) => dropUrl(s.url));
      return [];
    });
  }

  useEffect(() => {
    if (!isPending && !state?.error && formRef.current) {
      formRef.current.reset();
      setContent("");
      setKind("post");
      setShowTitle(false);
      setShowLink(false);
      setShowTags(false);
      // form.reset() only clears the DOM; the category lives in React state
      // and would survive into the next post otherwise. Same for the images.
      setCategory(null);
      // Same idempotent-updater trick clearShots() uses, and for the same
      // reason: callable from an effect without taking `imagePreview` as a
      // dependency. Revoking twice under StrictMode is a no-op.
      setImagePreview((prev) => {
        dropUrl(prev);
        return null;
      });
      clearShots();
      setFileError(null);
    }
  }, [isPending, state]);

  // 'post' and 'milestone': UNCHANGED on the wire. The file still goes up
  // straight from the input's own FileList, at its original bytes — see the
  // note on the downscaler at onPickShots. The only change here is revoking
  // the previous preview URL, which leaked on every re-pick and on remove.
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    // trackUrl OUTSIDE the updater: a StrictMode double-invocation of an
    // updater that creates a URL would create two and keep one.
    const next = f ? trackUrl(f) : null;
    dropUrl(imagePreview);
    setImagePreview(next);
  }
  function removeImage() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    dropUrl(imagePreview);
    setImagePreview(null);
  }

  // THE PICK HANDLER, and the one place the transport is reconciled.
  //
  // Order matters and each step is here for a different failure:
  //   1. TYPE, before anything expensive. `accept` is bypassable, so this is
  //      the first real check a .pdf meets. Same sentence the server uses.
  //   2. DOWNSCALE, one file at a time (never Promise.all — five concurrent
  //      full-resolution canvases is how a phone loses the tab). This runs
  //      BEFORE the per-file size check on purpose: a 12MB phone photo becomes
  //      ~300KB and is simply accepted, instead of being bounced back to a
  //      maker who then has to go and re-export it. That is the whole reason
  //      the fix is a downscaler and not a lower cap.
  //   3. PER-FILE SIZE, on the RESULT. Still needed: the downscaler fails soft
  //      and hands back the original, so an undecodable 12MB HEIC still has to
  //      be named and refused here rather than at the server.
  //   4. RUNNING TOTAL, the backstop that did not exist. See
  //      MAX_TOTAL_IMAGE_BYTES.
  async function onPickShots(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    // Emptied straight away: the input is a picker, and a value left in it
    // means re-picking the SAME file fires no change event at all.
    e.target.value = "";
    if (!picked.length) return;

    const badType = picked.find((f) => !ACCEPTED_IMAGE_TYPES.includes(f.type));
    const typed = picked.filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
    const room = Math.max(0, MAX_PRODUCT_IMAGES - shots.length);

    // Only compress what there is ROOM for. Downscaling five files to then
    // throw three of them away is a second of someone's battery for nothing.
    const candidates = typed.slice(0, room);

    const prepared: File[] = [];
    if (candidates.length) {
      setPreparing(true);
      try {
        for (const f of candidates) {
          prepared.push((await downscaleImage(f)).file);
        }
      } finally {
        // In a finally because the strip and both buttons stay disabled on
        // `preparing`; leaving it true after a throw would wedge the composer.
        // (downscaleImage itself never throws — this is for the loop.)
        setPreparing(false);
      }
    }

    const oversize = prepared.find((f) => f.size > MAX_IMAGE_BYTES);

    // `shots` is read from this render's closure, which is safe ONLY because
    // the picker button is disabled while `preparing` — two overlapping picks
    // would both total up against the same stale strip and could jointly
    // exceed MAX_TOTAL_IMAGE_BYTES. Keep that disable.
    let total = shots.reduce((n, s) => n + s.file.size, 0);
    const take: File[] = [];
    let overflowed = false;
    for (const f of prepared) {
      if (f.size > MAX_IMAGE_BYTES) continue;
      if (total + f.size > MAX_TOTAL_IMAGE_BYTES) {
        overflowed = true;
        continue;
      }
      total += f.size;
      take.push(f);
    }

    // ONE message, most-specific first. Both of the top two name the file,
    // because "Max image size is 5MB." in front of a four-file pick does not
    // say which one to go and fix, which is the only thing the maker actually
    // needs. Type beats size (the file is not an image at all), size beats the
    // total (one named file to fix, not an arithmetic problem), and the total
    // beats the count (it is the one that would otherwise come back as the
    // framework's unexplained 400).
    setFileError(
      badType
        ? tr("{name} isn't a JPG, PNG, WebP, or GIF.").replace(
            "{name}",
            badType.name,
          )
        : oversize
          ? tr("{name} is over 5MB.").replace("{name}", oversize.name)
          : overflowed
            ? tr(
                "Screenshots can add up to {n}MB in total — remove one, or pick a smaller shot.",
              ).replace("{n}", String(MAX_TOTAL_IMAGE_BYTES / (1024 * 1024)))
            : typed.length > room
              ? tr("Up to {n} screenshots — the extras weren't added.").replace(
                  "{n}",
                  String(MAX_PRODUCT_IMAGES),
                )
              : null,
    );

    if (!take.length) return;
    // The thumbnail is made from the DOWNSCALED file, not the original: fewer
    // bytes for the browser to decode, and it shows the maker what will
    // actually be uploaded — a black-backgrounded PNG would be visible here
    // rather than only on /products after posting.
    //
    // Built OUTSIDE the updater. React double-invokes updaters under
    // StrictMode, so creating the URLs inside one creates two per file and
    // keeps one — measured as 6 createObjectURL calls for 3 screenshots. The
    // unmount cleanup above did collect the strays, but an updater that has
    // side effects is a leak waiting for the next person to move the cleanup.
    const entries = take.map((file) => ({ file, url: trackUrl(file) }));
    setShots((prev) => [...prev, ...entries]);
  }

  // Keyed by object URL, not by index: removing the second of four would
  // otherwise re-key every thumbnail after it and reuse the wrong <img>.
  function removeShot(url: string) {
    dropUrl(url);
    setShots((prev) => prev.filter((s) => s.url !== url));
    setFileError(null);
  }

  // Exactly one image input is mounted at a time (see the inputs below), so
  // switching kind drops the other one's DOM value. Clearing the matching
  // preview is what keeps the composer honest — a thumbnail on screen for a
  // file that will not be submitted is worse than no thumbnail.
  function chooseKind(next: Kind) {
    setKind(next);
    setFileError(null);
    if (next === "show_and_tell") removeImage();
    else clearShots();
  }

  // The form's own action. Server-side the product path reads `images` with
  // getAll(), so the entries have to be the strip's files in the strip's
  // order; the input's own entries are deleted first because they are only
  // ever the LAST pick, never the accumulated set.
  function submit(formData: FormData) {
    formData.delete("images");
    if (isProduct) {
      for (const s of shots) formData.append("images", s.file);
    }
    formAction(formData);
  }

  const remaining = 5000 - content.length;
  const tooLong = remaining < 0;
  const shotsFull = shots.length >= MAX_PRODUCT_IMAGES;

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
      action={submit}
      className={cardClasses({ padding: "xs" })}
    >
      <input type="hidden" name="kind" value={kind} />

      {/* ONE file input is mounted at a time, the same rule the title and
          link fields follow below: 'post' and 'milestone' submit `image` (one
          file, read with formData.get) and a product submits `images` (up to
          MAX_PRODUCT_IMAGES, read with getAll). Mounting both would hand the
          product's cover to the single-image path as well — two uploads of
          the same bytes, and the row's legacy `image_url` written from a file
          the strip never showed. */}
      {isProduct ? (
        <input
          ref={shotsInputRef}
          type="file"
          name="images"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          // Wrapped rather than passed directly: onPickShots is async now
          // (it downscales), and handing a Promise-returning function to a DOM
          // event handler is the shape lint rules and reviewers both read as a
          // forgotten await.
          onChange={(ev) => {
            void onPickShots(ev);
          }}
        />
      ) : (
        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={onFile}
        />
      )}

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
              onClick={() => chooseKind(k.value)}
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

      {/* Gated on !isProduct now that the two kinds carry different inputs.
          Without it, switching to Show & tell would leave a preview on screen
          whose file is no longer attached to anything. */}
      {!isProduct && imagePreview && (
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

      {/* THE SCREENSHOT STRIP. The hint renders with an empty strip too: a
          product card on /products leads with its pictures, so "this surface
          wants screenshots" has to be visible BEFORE the maker has picked any,
          not discovered afterwards from a card that looks emptier than the
          ones beside it. */}
      {isProduct && (
        <div className="mt-3">
          {shots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {shots.map((s, i) => (
                <div
                  key={s.url}
                  className="relative h-20 w-24 overflow-hidden rounded-xl border border-line bg-cream"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {/* The grid card leads with the FIRST image and the hover
                      preview walks the rest, so which one is the cover cannot
                      be left to the maker's memory of the order they picked
                      in. Sentence case, not the badge tier's tracked caps:
                      Thai has no caps and the tracking is stripped in the th
                      locale anyway, so the caps would buy nothing and cost a
                      size. */}
                  {i === 0 && (
                    <CardChip className="absolute bottom-1 left-1 bg-navy/80 text-white">
                      {tr("Cover")}
                    </CardChip>
                  )}
                  {/* Always visible, not revealed on hover: half the people
                      posting from this composer are on a phone, which has no
                      hover state to reveal it with. */}
                  <button
                    type="button"
                    onClick={() => removeShot(s.url)}
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy/80 text-white transition-colors hover:bg-navy"
                    aria-label={tr("Remove")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-ink-muted">
            {tr("Up to {n} images. JPG/PNG, up to 5MB each.").replace(
              "{n}",
              String(MAX_PRODUCT_IMAGES),
            )}
          </p>
          {fileError && (
            <p className="mt-1 text-xs text-danger-ink">{fileError}</p>
          )}
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
          {/* One affordance, not two: the strip above deliberately has no
              dashed "add" tile, because a second picker that opens the same
              input is a second thing to keep in sync with the cap. The count
              rides on the label so the cap is legible before it is hit. */}
          <button
            type="button"
            onClick={() =>
              (isProduct ? shotsInputRef : fileInputRef).current?.click()
            }
            disabled={isProduct && (shotsFull || preparing)}
            className={`${toggleCls(
              isProduct ? shots.length > 0 : !!imagePreview,
            )} disabled:opacity-50`}
          >
            <ImagePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            {isProduct
              ? preparing
                ? // Resizing five 3MB shots is a visible second or two. The
                  // label says what is happening on the one control the maker
                  // just used, rather than adding a spinner somewhere else.
                  tr("Preparing images…")
                : shots.length > 0
                  ? `${tr("Screenshots")} ${shots.length}/${MAX_PRODUCT_IMAGES}`
                  : tr("Screenshots")
              : tr("Photo")}
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
            // NOT cosmetic: `shots` is only filled once the downscaler has
            // finished, so a Post pressed mid-resize would send a product with
            // no screenshots and no warning.
            preparing ||
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
