"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadAvatarAction } from "@/components/avatar-actions";
import { getInitials } from "@/components/Avatar";

type Props = {
  /** Accepted for call-site compatibility; the server action derives the user from the session. */
  userId?: string;
  initialUrl?: string | null;
  name?: string | null;
};

export function AvatarUploader({ initialUrl, name }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max image size is 5MB.");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadAvatarAction(fd);
      if (res.error || !res.url) throw new Error(res.error ?? "Upload failed.");
      setUrl(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-20 h-20 bg-navy flex items-center justify-center text-white font-serif text-3xl shrink-0 overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          getInitials(name)
        )}
        {uploading && (
          <div className="absolute inset-0 bg-navy/80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-line bg-white hover:border-navy text-ink text-sm tracking-wide transition-colors disabled:opacity-60"
        >
          <Camera className="w-4 h-4" />
          {url ? "Change photo" : "Add photo"}
        </button>
        <p className="text-xs text-ink-muted mt-2">
          Optional. JPG/PNG, up to 5MB.
        </p>
        {error && <p className="text-xs text-red-700 mt-1">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
