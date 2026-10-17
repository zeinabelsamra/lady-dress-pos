'use client'

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItem } from "./actions";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free size"];

const inputCls =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-stone-600">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddItemModal({
  supplierName,
  category,
  onClose,
}: {
  supplierName: string;
  category: { id: number; name: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  const cost = parseFloat(costPrice);
  const selling = parseFloat(sellingPrice);
  const margin =
    cost > 0 && selling > 0
      ? { profit: selling - cost, percent: Math.round(((selling - cost) / selling) * 100) }
      : null;

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Free the preview object URL when it changes or the modal closes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("categoryId", String(category.id));
    formData.set("size", size);

    startTransition(async () => {
      const result = await createItem(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg max-h-full overflow-y-auto bg-white rounded-2xl shadow-xl"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              {supplierName}
            </p>
            <h2 className="text-lg font-semibold text-stone-800">New item in {category.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-stone-500 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Photo */}
          <Field label="Photo">
            <label className="relative flex items-center justify-center h-44 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 hover:border-rose-300 cursor-pointer overflow-hidden transition-colors">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
              ) : (
                <span className="text-sm text-stone-400">Click to choose or take a photo</span>
              )}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={handlePhoto}
                className="sr-only"
              />
            </label>
          </Field>

          <Field label="Color" required>
            <input name="color" className={inputCls} placeholder="e.g. Black" required />
          </Field>

          <Field label="Size" required>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    size === s
                      ? "bg-rose-600 border-rose-600 text-white"
                      : "border-stone-200 text-stone-600 hover:border-rose-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              className={`${inputCls} mt-1.5`}
              placeholder="Or type a size, e.g. 38"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cost Price ($)" required>
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                placeholder="Paid to supplier"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
              />
            </Field>
            <Field label="Selling Price ($)" required>
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                placeholder="Price in the shop"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
              />
            </Field>
          </div>

          {margin != null && (
            <p className={`-mt-2 text-xs ${margin.profit > 0 ? "text-emerald-600" : "text-red-600"}`}>
              Profit per piece: ${margin.profit.toFixed(2)} ({margin.percent}% margin)
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity">
              <input
                name="quantity"
                type="number"
                min="0"
                step="1"
                defaultValue={1}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            {isPending ? "Saving…" : "Save Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
