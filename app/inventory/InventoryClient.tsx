'use client'

import { useState, useTransition } from "react";
import Link from "next/link";
import { adjustStock, type AdjustMode, type MovementType } from "./actions";

// ── Types ────────────────────────────────────────────────
export type VariantRow = {
  id: number;
  sku: string;
  size: string | null;
  color: string | null;
  barcode: string | null;
  stock: number;
  lowStockAt: number;
};

export type ProductRow = {
  id: number;
  name: string;
  brand: string | null;
  category: { name: string };
  variants: VariantRow[];
};

export type Movement = {
  id: number;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string; // ISO string (serialized from server)
  variant: { sku: string; product: { name: string } };
};

type ModalState = {
  variantId: number;
  sku: string;
  productName: string;
  currentStock: number;
  mode: "restock" | "adjust";
};

// ── Helpers ──────────────────────────────────────────────
function stockStatus(stock: number, lowStockAt: number) {
  if (stock === 0) return "out";
  if (stock <= lowStockAt) return "low";
  return "ok";
}

function StockPill({ stock, lowStockAt }: { stock: number; lowStockAt: number }) {
  const s = stockStatus(stock, lowStockAt);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        s === "out"
          ? "bg-red-50 text-red-600"
          : s === "low"
          ? "bg-amber-50 text-amber-600"
          : "bg-emerald-50 text-emerald-600"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          s === "out" ? "bg-red-400" : s === "low" ? "bg-amber-400" : "bg-emerald-400"
        }`}
      />
      {stock === 0 ? "Out of stock" : `${stock} in stock`}
    </span>
  );
}

function movementColor(type: string) {
  if (type === "SALE") return "text-red-500";
  if (type === "RESTOCK") return "text-emerald-600";
  if (type === "RETURN") return "text-blue-500";
  return "text-stone-500";
}

// ── Modal ────────────────────────────────────────────────
function AdjustModal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isRestock = modal.mode === "restock";
  const type: MovementType = isRestock ? "RESTOCK" : "ADJUSTMENT";
  const mode: AdjustMode = isRestock ? "add" : "set";

  const preview = () => {
    const n = parseInt(amount);
    if (isNaN(n) || n < 0) return null;
    if (isRestock) return modal.currentStock + n;
    return n;
  };

  function submit() {
    const n = parseInt(amount);
    if (isNaN(n) || n < 0) {
      setError("Enter a valid number.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adjustStock(modal.variantId, type, mode, n, reason);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-800">
              {isRestock ? "Restock" : "Adjust Stock"}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5 font-mono">{modal.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-stone-500 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Current stock */}
          <div className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3">
            <span className="text-xs text-stone-400">Current stock</span>
            <span className="text-lg font-bold text-stone-800">{modal.currentStock}</span>
          </div>

          {/* Mode toggle for adjust */}
          {!isRestock && (
            <p className="text-xs text-stone-500">
              Enter the <strong>new total</strong> stock count.
            </p>
          )}
          {isRestock && (
            <p className="text-xs text-stone-500">
              Enter the number of units <strong>received</strong>.
            </p>
          )}

          {/* Amount input */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              {isRestock ? "Units to add" : "New stock count"}
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            {preview() !== null && (
              <p className="text-xs text-stone-400 mt-1">
                New total will be{" "}
                <strong className="text-stone-700">{preview()} units</strong>
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              Reason <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              placeholder={isRestock ? "Supplier delivery, etc." : "Inventory count, damage, etc."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-stone-400 hover:text-stone-600 border border-stone-200 rounded-xl py-2.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className={`flex-1 text-sm font-semibold text-white rounded-xl py-2.5 transition-colors disabled:opacity-60 ${
              isRestock
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {isPending ? "Saving…" : isRestock ? "Add Stock" : "Set Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────
export default function InventoryClient({
  products,
  movements,
  lowStockCount,
  outOfStockCount,
}: {
  products: ProductRow[];
  movements: Movement[];
  lowStockCount: number;
  outOfStockCount: number;
}) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? products
        .map((p) => ({
          ...p,
          variants: p.variants.filter(
            (v) =>
              v.sku.toLowerCase().includes(search.toLowerCase()) ||
              (v.color?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
              (v.size?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
              p.name.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((p) => p.variants.length > 0)
    : products;

  function openModal(
    variant: VariantRow,
    productName: string,
    mode: "restock" | "adjust"
  ) {
    setModal({
      variantId: variant.id,
      sku: variant.sku,
      productName,
      currentStock: variant.stock,
      mode,
    });
  }

  return (
    <>
      {modal && <AdjustModal modal={modal} onClose={() => setModal(null)} />}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="page-title">Inventory</h1>
            <Link
              href="/products/new"
              className="text-sm font-medium text-rose-500 hover:text-rose-700 transition-colors"
            >
              + New Product
            </Link>
          </div>

          {/* Summary pills */}
          <div className="flex gap-3 mb-6">
            <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-violet-600">
                {products.reduce((n, p) => n + p.variants.length, 0)}
              </p>
              <p className="text-xs text-violet-400 mt-0.5">Total variants</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
              <p className="text-xs text-amber-400 mt-0.5">Low stock</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-red-500">{outOfStockCount}</p>
              <p className="text-xs text-red-400 mt-0.5">Out of stock</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              className="w-full max-w-sm rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              placeholder="Search by product, SKU, size, or color…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Inventory table */}
          <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-violet-50">
                    {["Product", "SKU", "Size", "Color", "Barcode", "Stock", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((product) =>
                    product.variants.map((variant, vi) => (
                      <tr
                        key={variant.id}
                        className={`hover:bg-stone-50 transition-colors ${
                          variant.stock === 0 ? "opacity-60" : ""
                        }`}
                      >
                        {/* Product name — only show on first variant row */}
                        <td className="px-4 py-3">
                          {vi === 0 ? (
                            <Link
                              href={`/products/${product.id}`}
                              className="font-medium text-stone-800 hover:text-rose-600 transition-colors"
                            >
                              {product.name}
                              {product.brand && (
                                <span className="ml-1.5 text-xs text-stone-400 font-normal">
                                  {product.brand}
                                </span>
                              )}
                            </Link>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-stone-500">
                          {variant.sku}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {variant.size ?? <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {variant.color ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-3 h-3 rounded-full border border-stone-200 shrink-0"
                                style={{ backgroundColor: variant.color.toLowerCase() }}
                              />
                              {variant.color}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-stone-400">
                          {variant.barcode ?? <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StockPill stock={variant.stock} lowStockAt={variant.lowStockAt} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openModal(variant, product.name, "restock")}
                              className="text-xs font-medium px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                              Restock
                            </button>
                            <button
                              onClick={() => openModal(variant, product.name, "adjust")}
                              className="text-xs font-medium px-3 py-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="text-center py-16 text-stone-400 text-sm">
                  No variants match your search.
                </div>
              )}
            </div>
          </div>

          {/* Recent movements */}
          <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-stone-700">Recent Stock Movements</h2>
            </div>
            {movements.length === 0 ? (
              <p className="px-6 py-8 text-sm text-stone-400 text-center">
                No movements yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-3">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide w-24 shrink-0 ${movementColor(
                        m.type
                      )}`}
                    >
                      {m.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700 truncate">
                        {m.variant.product.name}
                        <span className="ml-2 font-mono text-xs text-stone-400">
                          {m.variant.sku}
                        </span>
                      </p>
                      {m.reason && (
                        <p className="text-xs text-stone-400 truncate">{m.reason}</p>
                      )}
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        m.quantity > 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                    <span className="text-xs text-stone-400 shrink-0 w-32 text-right">
                      {new Date(m.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
