'use client'

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupplier } from "./actions";

export default function AddSupplierForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSupplier(name);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setName("");
      setOpen(false);
      router.push(`/products?supplier=${result.id}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-[calc(100%-1rem)] mx-2 mt-2 px-4 py-2 text-sm text-left text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-medium transition-colors"
      >
        + Add supplier
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-2 mt-2 p-2 rounded-lg bg-stone-50 border border-stone-200">
      <input
        autoFocus
        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
        placeholder="Shop name in Turkey"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          {isPending ? "Saving…" : "Add"}
        </button>
      </div>
    </form>
  );
}
