"use client";

import { useRef, useState } from "react";
import { Building2, ImagePlus, Loader2, X } from "lucide-react";
import { uploadOrgImageAction } from "../upload-actions";
import { useT } from "@/lib/i18n-client";

const MAX_PRODUCT_IMAGES = 6;

// Browser-side downscale + re-encode before upload (mirrors AvatarUploader).
// Keeps payloads under the Server Action body limit and saves bandwidth.
async function downscaleImage(file: File, maxDim: number): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode failed"));
      i.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale === 1 && file.size <= 512 * 1024) return file;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    return new File([blob], "image.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function upload(file: File, maxDim: number): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please pick an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Max image size is 5MB.");
  const optimized = await downscaleImage(file, maxDim);
  const fd = new FormData();
  fd.append("file", optimized);
  const res = await uploadOrgImageAction(fd);
  if (res.error || !res.url) throw new Error(res.error ?? "Upload failed.");
  return res.url;
}

export function OrgLogoField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setBusy(true);
    setError(null);
    try {
      onChange(await upload(file, 512));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-20 h-20 bg-cream border border-line flex items-center justify-center shrink-0 overflow-hidden rounded-xl">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-7 h-7 text-ink-muted" strokeWidth={1.5} />
        )}
        {busy && (
          <div className="absolute inset-0 bg-navy/80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 border border-line bg-white hover:border-navy text-ink text-sm transition-colors disabled:opacity-60 rounded-xl"
        >
          <ImagePlus className="w-4 h-4" />
          {value ? tr("Change logo") : tr("Upload logo")}
        </button>
        <p className="text-xs text-ink-muted mt-2">{tr("JPG/PNG, up to 5MB.")}</p>
        {error && <p className="text-xs text-danger-ink mt-1">{tr(error)}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handle(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function OrgProductImagesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= MAX_PRODUCT_IMAGES;

  async function handle(files: FileList) {
    setBusy(true);
    setError(null);
    try {
      const room = MAX_PRODUCT_IMAGES - value.length;
      const picked = Array.from(files).slice(0, room);
      const urls: string[] = [];
      for (const f of picked) urls.push(await upload(f, 1280));
      onChange([...value, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <div
            key={url}
            className="relative w-24 h-20 border border-line overflow-hidden group rounded-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={tr("Product image")} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-navy/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={tr("Remove")}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label={tr("Add image")}
            className="w-24 h-20 rounded-xl border border-dashed border-line hover:border-navy bg-white flex items-center justify-center text-ink-muted transition-colors disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-ink-muted mt-2">
        {(tr("Up to {n} images. JPG/PNG, up to 5MB each.")).replace(
          "{n}",
          String(MAX_PRODUCT_IMAGES),
        )}
      </p>
      {error && <p className="text-xs text-danger-ink mt-1">{tr(error)}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
