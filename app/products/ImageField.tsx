'use client'

import { useRef, useState, useTransition } from "react";
import { uploadProductPhoto } from "./actions";

// Product photo: upload a file from the computer/phone, or paste a web link.
export default function ImageField({
  value,
  onChange,
  inputCls,
}: {
  value: string;
  onChange: (url: string) => void;
  inputCls: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [isPending, startTransition] = useTransition();

  const trimmed = value.trim().replace(/^["']+|["']+$/g, "");
  const isLocalPath = !!trimmed && !/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/uploads/");

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      const result = await uploadProductPhoto(formData);
      if ("error" in result) setError(result.error);
      else {
        setBroken(false);
        onChange(result.url);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-stone-200 bg-gradient-to-br from-rose-100 via-fuchsia-50 to-violet-100 flex items-center justify-center">
        {trimmed && !isLocalPath && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trimmed} alt="Product photo" className="w-full h-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <span className="text-2xl opacity-40">👗</span>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileRef.current?.click()}
            className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            {isPending ? "Uploading…" : "📷 Upload photo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setError(null);
                setBroken(false);
              }}
              className="text-xs text-stone-400 hover:text-red-500 px-2"
            >
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        <input
          className={inputCls}
          placeholder="…or paste a web link (https://...)"
          value={value}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
        />
        {isLocalPath ? (
          <p className="text-xs text-red-600">
            That&apos;s a file on your computer, not a web link. Use &quot;Upload photo&quot; instead.
          </p>
        ) : broken ? (
          <p className="text-xs text-amber-600">
            This link doesn&apos;t open as an image. Copy the image address itself (right-click the
            picture → &quot;Copy image address&quot;).
          </p>
        ) : null}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
