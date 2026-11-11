"use client";

// A product's screenshots: the picker, the strip, and the rules that keep an
// upload inside what the server action can receive.
//
// MOVED, NOT COPIED, out of components/PostComposer.tsx when products left the
// community composer for their own page (app/(app)/products/new, CLAUDE.md
// Language Rules: products are added quietly there). The composer kept its one
// cover photo; everything about SEVERAL images lives here, and this is its only
// copy. The bytes go up through createProductAction (lib/post-actions.ts),
// which re-checks every rule below — this file only keeps a doomed upload off
// the wire and tells the maker which file to fix.
//
// Two halves, because the form that owns the submit needs the files:
//   useScreenshots()   the state — the picked files in strip order, the
//                      downscale in progress, the one error line
//   <ScreenshotPicker> what the maker sees and presses
// The form appends `shots.files` to its FormData as repeated `images` entries
// (createProductAction reads them with getAll), and gates its own submit on
// `shots.preparing`.

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  MAX_POST_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  POST_IMAGE_TYPES,
} from "@/lib/post-types";
import { useT } from "@/lib/i18n-client";
import { downscaleImage } from "@/lib/downscale-image";
import { Button, CardChip } from "@/components/ui";

const ACCEPTED: readonly string[] = POST_IMAGE_TYPES;
const ACCEPT_ATTR = POST_IMAGE_TYPES.join(",");

// THE BACKSTOP THE PER-FILE CAPS NEVER HAD: what the screenshots may add up
// to, TOGETHER, enforced after downscaling.
//
// next.config.ts sets `experimental.serverActions.bodySizeLimit: "6mb"` and its
// comment records why that number: it was sized for ONE 5MB image plus
// multipart overhead, from the avatar work, when one image was all a post
// could carry. A product carries MAX_PRODUCT_IMAGES of them, so the maximum
// payload the per-file caps accept is 5 x 5MB = 25MB against a 6MB ceiling —
// and the framework rejects an oversized body BEFORE the action runs, so not
// one of its per-file checks and not one line of its orphan cleanup executes.
// next.config.ts names the symptom: "An unexpected response was received from
// the server."
//
// 4MiB leaves ~2MiB of the 6MiB ceiling for the multipart boundaries, the
// description, the name, the link, the category and React's own action
// payload. That is deliberately loose — the downscaler puts a 1600px
// screenshot at 150-400KB, so five of them land around 1-2MB and a maker never
// meets this limit in the normal case.
//
// IF bodySizeLimit MOVES, MOVE THIS, AND KEEP THE GAP. They are one contract
// split across two files, which is how they drifted in the first place.
const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024;

type Shot = { file: File; url: string };

export type Screenshots = ReturnType<typeof useScreenshots>;

export function useScreenshots() {
  const tr = useT();

  // REACT STATE is the source of truth, not the input's own FileList, and that
  // is forced rather than chosen:
  //   1. a native <input multiple> REPLACES its FileList on every pick, so a
  //      second trip to the picker would silently drop the first batch — and
  //      picking five screenshots in one go from five different folders is not
  //      how anyone has them;
  //   2. a single thumbnail cannot be removed from a FileList at all without
  //      rebuilding one through DataTransfer.
  // So the input is only a PICKER (it has no `name`, and is emptied after every
  // pick), and the form puts exactly what the strip shows into its FormData, in
  // the strip's order.
  const [shots, setShots] = useState<Shot[]>([]);
  const [error, setError] = useState<string | null>(null);
  // True while the picked files are being downscaled. The form gates its
  // submit on it and the picker button disables itself on it, and both are
  // load-bearing: submitting mid-downscale would send a product with no
  // screenshots at all, and a second pick starting mid-downscale would read a
  // stale `shots` when it totals up the bytes.
  const [preparing, setPreparing] = useState(false);

  // Every object URL this hook has created and not yet revoked.
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
  function dropUrl(url: string) {
    URL.revokeObjectURL(url);
    liveUrls.current.delete(url);
  }

  // THE UNMOUNT LEAK. Remove and clear revoke their URLs already; navigating
  // away in the middle does not, and an object URL is held by the document
  // until it is revoked or the document is destroyed — so a maker who picked
  // five screenshots and then clicked away left five decoded images pinned in
  // memory. Empty deps on purpose: this runs once, on unmount, and reads the
  // ref.
  useEffect(
    () => () => {
      liveUrls.current.forEach((url) => URL.revokeObjectURL(url));
      liveUrls.current.clear();
    },
    [],
  );

  // THE PICK HANDLER, and the one place the transport is reconciled.
  //
  // Order matters and each step is here for a different failure:
  //   1. TYPE, before anything expensive. `accept` is only a HINT to the file
  //      dialog — every desktop picker offers an "All files" escape and a
  //      drag-drop bypasses it entirely — so this is the first real check a
  //      .pdf meets.
  //   2. DOWNSCALE, one file at a time (never Promise.all — five concurrent
  //      full-resolution canvases is how a phone loses the tab). This runs
  //      BEFORE the per-file size check on purpose: a 12MB phone photo becomes
  //      ~300KB and is simply accepted, instead of being bounced back to a
  //      maker who then has to go and re-export it.
  //   3. PER-FILE SIZE, on the RESULT. Still needed: the downscaler fails soft
  //      and hands back the original, so an undecodable 12MB HEIC still has to
  //      be named and refused here rather than at the server.
  //   4. RUNNING TOTAL, the backstop. See MAX_TOTAL_IMAGE_BYTES.
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    // Emptied straight away: the input is a picker, and a value left in it
    // means re-picking the SAME file fires no change event at all.
    e.target.value = "";
    if (!picked.length) return;

    const badType = picked.find((f) => !ACCEPTED.includes(f.type));
    const typed = picked.filter((f) => ACCEPTED.includes(f.type));
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
        // In a finally because the picker and the form's submit stay disabled
        // on `preparing`; leaving it true after a throw would wedge the form.
        // (downscaleImage itself never throws — this is for the loop.)
        setPreparing(false);
      }
    }

    const oversize = prepared.find((f) => f.size > MAX_POST_IMAGE_BYTES);

    // `shots` is read from this render's closure, which is safe ONLY because
    // the picker button is disabled while `preparing` — two overlapping picks
    // would both total up against the same stale strip and could jointly
    // exceed MAX_TOTAL_IMAGE_BYTES. Keep that disable.
    let total = shots.reduce((n, s) => n + s.file.size, 0);
    const take: File[] = [];
    let overflowed = false;
    for (const f of prepared) {
      if (f.size > MAX_POST_IMAGE_BYTES) continue;
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
    setError(
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
    // rather than only on the shelf after adding it.
    //
    // Built OUTSIDE the updater. React double-invokes updaters under
    // StrictMode, so creating the URLs inside one creates two per file and
    // keeps one — measured as 6 createObjectURL calls for 3 screenshots.
    const entries = take.map((file) => ({ file, url: trackUrl(file) }));
    setShots((prev) => [...prev, ...entries]);
  }

  // Keyed by object URL, not by index: removing the second of four would
  // otherwise re-key every thumbnail after it and reuse the wrong <img>.
  function remove(url: string) {
    dropUrl(url);
    setShots((prev) => prev.filter((s) => s.url !== url));
    setError(null);
  }

  return {
    shots,
    /** The files to submit, in strip order. The first is the cover. */
    files: shots.map((s) => s.file),
    preparing,
    error,
    full: shots.length >= MAX_PRODUCT_IMAGES,
    pick,
    remove,
  };
}

/**
 * The field: label, strip, the one picker button, the limits, and the error.
 * `id` names the field for the label and the hint; the strings are translated
 * here (this is a client component, and every one of them already has Thai).
 */
export function ScreenshotPicker({
  shots,
  id,
}: {
  shots: Screenshots;
  id: string;
}) {
  const tr = useT();
  // The picker input's ref lives HERE, not in the hook: the state object is
  // read during render, and a ref inside it would make every one of those
  // reads a ref read.
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hintId}>
      <div className="mb-2 flex items-center justify-between">
        {/* The app's form-FIELD label idiom (components/ui/Input.tsx), not
            <Eyebrow>: different role. */}
        <span
          id={labelId}
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
        >
          {tr("Screenshots")}
        </span>
        <span className="text-xs text-ink-muted tabular-nums">
          {shots.shots.length > 0
            ? `${shots.shots.length}/${MAX_PRODUCT_IMAGES}`
            : tr("Optional")}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        // Wrapped rather than passed directly: pick is async (it downscales),
        // and handing a Promise-returning function to a DOM event handler is
        // the shape lint rules and reviewers both read as a forgotten await.
        onChange={(ev) => {
          void shots.pick(ev);
        }}
      />

      {/* THE STRIP. The deck card leads with the FIRST image, and it is the
          only one a card waiting behind the top card shows, so which one is
          the cover cannot be left to the maker's memory of the order they
          picked in. */}
      {shots.shots.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {shots.shots.map((s, i) => (
            <div
              key={s.url}
              className="relative h-20 w-24 overflow-hidden rounded-xl border border-line bg-cream"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" className="h-full w-full object-cover" />
              {/* Sentence case, not the badge tier's tracked caps: Thai has no
                  caps and the tracking is stripped in the th locale anyway. */}
              {i === 0 && (
                <CardChip className="absolute bottom-1 left-1 bg-navy/80 text-white">
                  {tr("Cover")}
                </CardChip>
              )}
              {/* Always visible, not revealed on hover: a phone has no hover
                  state to reveal it with. */}
              <button
                type="button"
                onClick={() => shots.remove(s.url)}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy/80 text-white transition-colors hover:bg-navy"
                aria-label={tr("Remove")}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* One affordance, not two: no dashed "add" tile in the strip, because a
          second picker that opens the same input is a second thing to keep in
          sync with the cap. */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={shots.full || shots.preparing}
      >
        <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
        {shots.preparing
          ? // Resizing five 3MB shots is a visible second or two. The label
            // says what is happening on the one control the maker just used.
            tr("Preparing images…")
          : tr("Add screenshots")}
      </Button>

      <p id={hintId} className="mt-2 text-xs text-ink-muted">
        {tr("Up to {n} images. JPG/PNG, up to 5MB each.").replace(
          "{n}",
          String(MAX_PRODUCT_IMAGES),
        )}
      </p>
      {shots.error && (
        <p className="mt-1 text-xs text-danger-ink" role="alert">
          {shots.error}
        </p>
      )}
    </div>
  );
}
