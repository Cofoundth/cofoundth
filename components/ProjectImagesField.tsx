"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadProjectImageAction } from "@/components/project-image-actions";
import { useT } from "@/lib/i18n-client";

// Controlled image gallery used by both onboarding and settings. Uploads each
// picked file immediately and emits the resulting URL list via onChange. Also
// renders hidden <input name="project_images"> so DOM-FormData forms (settings)
// pick the URLs up without extra wiring.
export function ProjectImagesField({
  value,
  onChange,
  max = 3,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const take = files.slice(0, max - value.length);
    start(async () => {
      setError(null);
      const urls: string[] = [];
      for (const f of take) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await uploadProjectImageAction(fd);
        if (res.error) {
          setError(res.error);
          break;
        }
        if (res.url) urls.push(res.url);
      }
      if (urls.length) onChange([...value, ...urls].slice(0, max));
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <div
            key={url}
            className="relative w-24 h-24 border border-line overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-1 right-1 bg-navy/80 hover:bg-navy text-white p-0.5"
              aria-label={tr("Remove")}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="w-24 h-24 border border-dashed border-line hover:border-navy text-ink-muted hover:text-navy flex flex-col items-center justify-center gap-1 text-xs disabled:opacity-50 transition-colors"
          >
            {pending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5" strokeWidth={1.5} />
            )}
            {tr("Add image")}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={onPick}
      />
      {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
      {value.map((url) => (
        <input key={url} type="hidden" name="project_images" value={url} />
      ))}
    </div>
  );
}
