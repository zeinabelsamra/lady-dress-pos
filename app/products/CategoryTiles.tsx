'use client'

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "./actions";
import AddItemModal from "./AddItemModal";

type Category = { id: number; name: string; itemCount: number };

// Each tile gets its own colour, cycling through the palette
const tileColors = [
  "from-rose-100 to-pink-50 border-rose-200 hover:border-rose-400",
  "from-violet-100 to-purple-50 border-violet-200 hover:border-violet-400",
  "from-amber-100 to-orange-50 border-amber-200 hover:border-amber-400",
  "from-sky-100 to-cyan-50 border-sky-200 hover:border-sky-400",
  "from-emerald-100 to-teal-50 border-emerald-200 hover:border-emerald-400",
  "from-fuchsia-100 to-pink-50 border-fuchsia-200 hover:border-fuchsia-400",
];

export default function CategoryTiles({
  supplier,
  categories,
}: {
  supplier: { id: number; name: string };
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCategory(supplier.id, newName);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNewName("");
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <section className="mb-10">
      <p className="text-xs text-stone-400 mb-3">
        Click a category to add a new item to it.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`group text-left bg-gradient-to-br ${tileColors[i % tileColors.length]} rounded-xl border px-4 py-4 hover:shadow-md transition-all`}
          >
            <p className="text-sm font-semibold text-stone-800 truncate">{cat.name}</p>
            <p className="text-xs text-stone-500 mt-1">
              {cat.itemCount} {cat.itemCount === 1 ? "item" : "items"}
            </p>
            <p className="text-xs font-medium text-rose-500 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              + Add item
            </p>
          </button>
        ))}

        {adding ? (
          <form
            onSubmit={handleAddCategory}
            className="bg-white rounded-xl border border-rose-200 px-3 py-3 flex flex-col gap-2"
          >
            <input
              autoFocus
              className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
              placeholder="e.g. Vests"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
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
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-xl border-2 border-dashed border-fuchsia-200 bg-white/50 px-4 py-4 text-sm font-medium text-fuchsia-400 hover:border-rose-300 hover:text-rose-500 transition-colors"
          >
            + Add category
          </button>
        )}
      </div>

      {activeCategory && (
        <AddItemModal
          supplierName={supplier.name}
          category={activeCategory}
          onClose={() => setActiveCategory(null)}
        />
      )}
    </section>
  );
}
