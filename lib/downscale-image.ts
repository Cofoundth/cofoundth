// Resize + re-encode a picked image IN THE BROWSER, before it is uploaded.
//
// BROWSER ONLY. No "use client" directive because there is no React here and
// nothing to put on a client boundary — but it touches `document` and
// `createImageBitmap`, so it may only be imported from a client component.
//
// ── WHY THIS EXISTS: THE TRANSPORT, NOT THE PIXELS ────────────────────────
// A product post carries up to MAX_PRODUCT_IMAGES screenshots at 5MB each
// (lib/post-types.ts, lib/post-actions.ts) through a Server Action whose body
// limit is 6mb (next.config.ts). 25MB of accepted payload against a 6MB
// ceiling. Worse, the framework rejects an oversized body BEFORE the action
// function runs, so none of createProductAction's per-file validation and none of
// its orphan cleanup ever execute — the maker gets "An unexpected response was
// received from the server." and no idea which file to blame.
//
// Raising the limit was the wrong fix (25MB through a Server Action is a bad
// shape, and serverless request-body limits sit below it anyway). Lowering the
// per-file cap was also wrong: a phone screenshot off a Thai founder's device
// is routinely 1-3MB, so the cap would reject exactly the normal case and send
// the maker away to re-export files by hand. Getting makers to post at all is
// the entire point of /products.
//
// So: shrink the bytes before they go on the wire. The screenshot picker
// (components/ScreenshotPicker.tsx) enforces a running TOTAL on top of this
// (see MAX_TOTAL_IMAGE_BYTES there) — this module
// makes that total easy to live inside, it does not enforce it.
//
// ── IT IS ALSO THE ONLY COMPRESSION THIS SURFACE GETS ─────────────────────
// next.config.ts declares no `images` block, so the storage host is not in
// `remotePatterns` and every <Image> on /products renders `unoptimized`
// (the `unoptimized` note in components/ProductGallery.tsx, which loads every
// image of the deck's top card and of the card next in line, and every image
// on a product's page). There is no resizing proxy and no srcset: THE
// UPLOADED BYTES ARE THE BYTES EVERY VISITOR
// DOWNLOADS. A 4MB screenshot uploaded once is 4MB downloaded by every reader
// who reaches that card, forever. 1600px at q0.82 is the whole optimisation
// pipeline.
//
// ── FAIL SOFT, ALWAYS ─────────────────────────────────────────────────────
// Every failure path returns the ORIGINAL File and lets the server's own
// validation speak. An unsupported type, a canvas that runs out of memory on
// an old phone, a HEIC the browser cannot decode, a truncated PNG — none of
// them may block a maker from posting. Compression is an optimisation; the
// post is the product.

/** Long edge, in CSS pixels, that an image is fitted inside. Images smaller
 *  than this keep their own dimensions — never upscaled. 1600 covers the 3-up
 *  grid card (328px) and a full-width phone view at 3x with room to spare. */
export const DOWNSCALE_MAX_EDGE = 1600;

/** Encoder quality. 0.82 is the usual knee for screenshots: visually clean
 *  text, roughly a tenth of the bytes of a PNG of the same shot. */
export const DOWNSCALE_QUALITY = 0.82;

// Types this module will DECODE and re-encode.
//
// GIF is deliberately absent even though the server accepts it: a canvas
// re-encode keeps the first frame and silently throws the animation away. An
// animated GIF therefore passes through untouched and counts its full size
// against the picker's total — which is honest, and the right trade. The
// alternative is a maker posting a demo GIF that has stopped moving.
const DECODABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

// Output MIME must be a key of IMG_EXT in lib/post-actions.ts — that map is
// what turns `file.type` into a storage extension, and a type it does not know
// is rejected with "Please upload a JPG, PNG, WebP, or GIF." Both of these are
// in it.
type OutputMime = "image/webp" | "image/jpeg";

// Probed once, lazily, and cached for the page's life.
let webpEncodeSupport: boolean | null = null;

/**
 * Can this browser ENCODE WebP from a canvas?
 *
 * Feature-detected, not user-agent sniffed: `toDataURL` with a MIME type the
 * encoder does not have falls back to PNG and says so in the data URL's own
 * prefix, which is the spec'd behaviour and the only honest signal available.
 * (Decode support is irrelevant here — Safari could display WebP for two
 * versions before it could write one.)
 */
function canEncodeWebp(): boolean {
  if (webpEncodeSupport !== null) return webpEncodeSupport;
  try {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    webpEncodeSupport = probe
      .toDataURL("image/webp")
      .startsWith("data:image/webp");
    probe.width = 0;
    probe.height = 0;
  } catch {
    webpEncodeSupport = false;
  }
  return webpEncodeSupport;
}

/**
 * The output filename. The extension has to match the new MIME or the file
 * reads as a mislabelled one everywhere a human looks at it (the storage key
 * is built from the MIME, not from this, so nothing breaks — it is just a lie
 * in the UI and in the maker's download). Path separators are stripped
 * because some pickers hand back a relative path, and a slash in a filename
 * is a surprise nobody needs.
 */
function renamed(name: string, mime: OutputMime): string {
  const ext = mime === "image/webp" ? "webp" : "jpg";
  const base = name
    .replace(/\.[^./\\]+$/, "")
    .replace(/[\\/]+/g, "-")
    .trim();
  return `${base || "image"}.${ext}`;
}

export type DownscaleResult = {
  /** The file to upload: the re-encoded one, or the original untouched. */
  file: File;
  /** False when `file` IS the input — nothing was re-encoded. */
  changed: boolean;
  /** Why it was left alone. Diagnostics for the console and for tests; never
   *  shown to anyone. The maker's message comes from the picker. */
  reason?: string;
};

/**
 * Fit `file` inside DOWNSCALE_MAX_EDGE and re-encode it.
 *
 * CONTRACT
 *   - NEVER throws and never rejects. Every failure resolves with the original
 *     file and `changed: false`.
 *   - Never upscales: an image already inside the box keeps its dimensions
 *     (it is still re-encoded, which is where most of the saving on a PNG
 *     screenshot comes from).
 *   - Never returns something LARGER than the input. An already-tight JPEG
 *     comes back untouched.
 *   - Output is WebP where the browser can encode it, JPEG otherwise. Both are
 *     types the server accepts.
 *   - EXIF orientation is applied, so a phone photo does not arrive sideways.
 *   - Transparency survives as WebP; on the JPEG fallback it is composited
 *     onto WHITE, never the black a bare canvas-to-JPEG gives you.
 *   - Frees the bitmap and the canvas backing store before returning.
 *
 * Runs one image at a time by design — the caller must not fan these out with
 * Promise.all, because five simultaneous full-resolution canvases is how an
 * older phone gets its tab killed.
 */
export async function downscaleImage(file: File): Promise<DownscaleResult> {
  if (!DECODABLE.has(file.type)) {
    return {
      file,
      changed: false,
      reason: `not re-encoded: ${file.type || "unknown type"}`,
    };
  }

  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    // `imageOrientation: "from-image"` is the whole EXIF story. A phone photo
    // carries its rotation in metadata, and a canvas draw of a bitmap decoded
    // with the default ("none") discards it — the upload comes out sideways
    // while the picker's own thumbnail looked upright, because the picker
    // honoured the metadata. createImageBitmap is used here (rather than an
    // <img> + decode()) precisely because it is the path that takes this
    // option; with an <img> the orientation fix is browser-dependent and
    // untestable.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const sw = bitmap.width;
    const sh = bitmap.height;
    if (!sw || !sh) throw new Error("decoded to a zero-sized bitmap");

    // min(1, …) is the no-upscale rule.
    const scale = Math.min(1, DOWNSCALE_MAX_EDGE / Math.max(sw, sh));
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));

    const mime: OutputMime = canEncodeWebp() ? "image/webp" : "image/jpeg";

    canvas = document.createElement("canvas");
    canvas.width = dw;
    canvas.height = dh;
    // alpha:false for the JPEG path saves a byte per pixel and makes the
    // flattening explicit. It also means the canvas starts BLACK, which is
    // exactly the bug below — hence the fill.
    const ctx = canvas.getContext("2d", { alpha: mime === "image/webp" });
    if (!ctx) throw new Error("no 2d context");

    if (mime === "image/jpeg") {
      // THE ALPHA TRAP. JPEG has no alpha channel, so a transparent PNG
      // re-encoded to JPEG gets whatever was underneath it — on a canvas,
      // black. A logo on a transparent background becomes a logo on a black
      // slab. Painting white first is the fix; WebP needs none of this, which
      // is why it is preferred above.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, dw, dh);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, dw, dh);

    const blob = await new Promise<Blob | null>((resolve) => {
      // Non-null: assigned above, and toBlob is called before the finally.
      canvas!.toBlob(resolve, mime, DOWNSCALE_QUALITY);
    });
    if (!blob || blob.size === 0) throw new Error("encoder produced nothing");
    // Belt and braces on canEncodeWebp(): if toBlob disagreed with toDataURL
    // about what it can write, we would be handing the server a PNG labelled
    // .webp. Bail to the original rather than guess.
    if (blob.type !== mime) {
      throw new Error(`encoder returned ${blob.type || "no type"}`);
    }

    // Unconditional, not just when scale === 1. A big, already-well-compressed
    // photo can re-encode LARGER at 1600px than it was at 4000px, and the
    // budget this exists to protect is measured in bytes on the wire, not in
    // pixels. The cost of that choice is honest: such a file stays large in
    // dimensions and the browser decodes more than it needs to.
    if (blob.size >= file.size) {
      return { file, changed: false, reason: "re-encode was not smaller" };
    }

    return {
      file: new File([blob], renamed(file.name, mime), {
        type: mime,
        lastModified: file.lastModified,
      }),
      changed: true,
    };
  } catch (err) {
    // Unsupported source, a HEIC this browser cannot decode, a truncated file,
    // canvas memory on an old phone — all the same answer: hand back what we
    // were given and let the server validate it.
    return {
      file,
      changed: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  } finally {
    bitmap?.close();
    if (canvas) {
      // Setting both to 0 is what actually releases the backing store; simply
      // dropping the reference leaves iOS Safari holding the pixels until GC
      // feels like it, which is the difference between five screenshots
      // working and the tab reloading.
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
