'use client'

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, type VariantInput, type ProductInput } from "./actions";
import ImageField from "../ImageField";

type Category = { id: number; name: string };

const emptyVariant = (): VariantInput => ({
  sku: "",
  size: "",
  color: "",
  barcode: "",
  stock: 0,
  price: "",
});

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

const inputCls =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition";

export default function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">(
    categories[0]?.id ?? ""
  );
  const [basePrice, setBasePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [variants, setVariants] = useState<VariantInput[]>([emptyVariant()]);

  function updateVariant(index: number, field: keyof VariantInput, value: string | number) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setError(null);

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    const data: ProductInput = {
      name,
      brand,
      description,
      categoryId: categoryId as number,
      basePrice: parseFloat(basePrice) || 0,
      costPrice,
      imageUrl,
      variants,
    };

    startTransition(async () => {
      const result = await createProduct(data);
      if (result?.error) setError(result.error);
      // on success, server action calls redirect() — no need to handle here
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-stone-400 mb-6">
        <button
          onClick={() => router.back()}
          className="hover:text-stone-600 transition-colors"
        >
          Products
        </button>
        <span>/</span>
        <span className="text-stone-600 font-medium">New Product</span>
      </nav>

      <h1 className="page-title mb-6">New Product</h1>

      {/* Error banner */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Product info card */}
      <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 p-6 mb-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">
          Product Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product Name" required>
            <input
              className={inputCls}
              placeholder="e.g. Floral Summer Dress"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Brand">
            <input
              className={inputCls}
              placeholder="e.g. Zara"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </Field>

          <Field label="Category" required>
            <select
              className={inputCls}
              value={categoryId}
              onChange={(e) => setCategoryId(parseInt(e.target.value))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Selling Price ($)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              placeholder="0.00"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </Field>

          <Field label="Cost Price ($)">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              placeholder="Optional — for margin calculation"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Photo">
              <ImageField value={imageUrl} onChange={setImageUrl} inputCls={inputCls} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Optional product description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Variants card */}
      <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">
            Variants
            <span className="ml-2 text-xs font-normal text-stone-400">
              (size × color combos — at least one required)
            </span>
          </h2>
        </div>

        {/* Header row */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-violet-50">
                {["SKU *", "Size", "Color", "Barcode", "Stock", "Price ($)", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {variants.map((v, i) => (
                <tr key={i} className="hover:bg-stone-50">
                  <td className="px-3 py-2">
                    <input
                      className={`${inputCls} font-mono text-xs w-36`}
                      placeholder="FSD-S-RED"
                      value={v.sku}
                      onChange={(e) => updateVariant(i, "sku", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={`${inputCls} w-20`}
                      placeholder="S / M / L"
                      value={v.size}
                      onChange={(e) => updateVariant(i, "size", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={`${inputCls} w-24`}
                      placeholder="Red"
                      value={v.color}
                      onChange={(e) => updateVariant(i, "color", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={`${inputCls} font-mono text-xs w-28`}
                      placeholder="Barcode"
                      value={v.barcode}
                      onChange={(e) => updateVariant(i, "barcode", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      className={`${inputCls} w-20`}
                      placeholder="0"
                      value={v.stock}
                      onChange={(e) =>
                        updateVariant(i, "stock", parseInt(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${inputCls} w-28`}
                      placeholder="Base price"
                      value={v.price}
                      onChange={(e) => updateVariant(i, "price", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      disabled={variants.length === 1}
                      className="text-stone-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none"
                      title="Remove variant"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-stone-100">
          <button
            type="button"
            onClick={addVariant}
            className="text-sm text-rose-500 hover:text-rose-700 font-medium transition-colors"
          >
            + Add variant
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {isPending ? "Saving…" : "Save Product"}
        </button>
      </div>
    </div>
  );
}
