'use client'

import { useState, useRef, useTransition, useEffect } from "react";
import { completeSale, type SaleSuccess } from "./actions";

// ── Types ────────────────────────────────────────────────
export type VariantData = {
  id: number;
  sku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  stock: number;
  price: number | null;
  product: {
    id: number;
    name: string;
    brand: string | null;
    basePrice: number;
  };
};

type CartItem = {
  variantId: number;
  sku: string;
  productName: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

// ── Helpers ──────────────────────────────────────────────
function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function variantLabel(v: { size: string | null; color: string | null }) {
  return [v.size, v.color].filter(Boolean).join(" / ") || "One size";
}

function toCartItem(v: VariantData): CartItem {
  return {
    variantId: v.id,
    sku: v.sku,
    productName: v.product.name,
    size: v.size,
    color: v.color,
    unitPrice: v.price ?? v.product.basePrice,
    quantity: 1,
    maxStock: v.stock,
  };
}

// ── Receipt overlay ──────────────────────────────────────
function ReceiptOverlay({
  receipt,
  onNewSale,
}: {
  receipt: SaleSuccess;
  onNewSale: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-500 px-6 py-5 text-center">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">Sale Complete</p>
          <p className="text-emerald-100 text-xs mt-0.5 font-mono">{receipt.receiptNo}</p>
        </div>

        {/* Items */}
        <div className="px-6 pt-4 pb-2 max-h-52 overflow-y-auto divide-y divide-stone-100">
          {receipt.items.map((item) => (
            <div key={item.variantId} className="flex justify-between py-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-stone-700 font-medium truncate">{item.productName}</p>
                <p className="text-stone-400 text-xs font-mono">{item.sku} · {variantLabel(item)}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-stone-700 font-medium">{formatPrice(item.unitPrice * item.quantity)}</p>
                <p className="text-stone-400 text-xs">{item.quantity} × {formatPrice(item.unitPrice)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mx-6 border-t border-stone-100 py-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span>{formatPrice(receipt.subtotal)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-rose-500">
              <span>Discount</span>
              <span>− {formatPrice(receipt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-stone-800 text-base pt-1 border-t border-stone-100">
            <span>Total</span>
            <span>{formatPrice(receipt.total)}</span>
          </div>
          <div className="flex justify-between text-stone-400 text-xs pt-1">
            <span>Payment</span>
            <span className="font-medium text-stone-600">{receipt.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-stone-400 text-xs">
            <span>Sold</span>
            <span className="font-medium text-stone-600">
              {receipt.channel === "ONLINE" ? "Online" : "In shop"}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={onNewSale}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────
export default function CheckoutClient({
  cashierName,
  variants,
  initialVariantId,
}: {
  cashierName: string;
  variants: VariantData[];
  initialVariantId: number | null;
}) {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (initialVariantId) {
      const v = variants.find((v) => v.id === initialVariantId && v.stock > 0);
      if (v) return [toCartItem(v)];
    }
    return [];
  });

  // Barcode + search
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  // Payment
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [channel, setChannel] = useState<"SHOP" | "ONLINE">("SHOP");

  // Result
  const [saleError, setSaleError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleSuccess | null>(null);

  // Auto-focus barcode input on load
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // ── Cart helpers ────────────────────────────────────────
  function addToCart(variant: VariantData) {
    setScanError(null);
    if (variant.stock === 0) {
      setScanError(`${variant.sku} is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= existing.maxStock) {
          setScanError(`Only ${existing.maxStock} units of ${variant.sku} in stock.`);
          return prev;
        }
        return prev.map((i) =>
          i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, toCartItem(variant)];
    });
  }

  function setQuantity(variantId: number, qty: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.min(Math.max(1, qty), i.maxStock) }
          : i
      )
    );
  }

  function removeFromCart(variantId: number) {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  // ── Barcode scan ────────────────────────────────────────
  function handleBarcodeScan() {
    const code = barcodeInput.trim();
    if (!code) return;
    setBarcodeInput("");

    const variant = variants.find(
      (v) => v.barcode === code || v.sku === code
    );
    if (!variant) {
      setScanError(`No product found for "${code}".`);
      return;
    }
    addToCart(variant);
    barcodeRef.current?.focus();
  }

  // ── Search results ──────────────────────────────────────
  const searchResults =
    searchQuery.trim().length >= 1
      ? variants.filter(
          (v) =>
            v.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.color?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
            (v.size?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        ).slice(0, 8)
      : [];

  // ── Totals ──────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  // ── Complete sale ───────────────────────────────────────
  function handleCompleteSale() {
    setSaleError(null);
    startTransition(async () => {
      const result = await completeSale({
        items: cart,
        discount: discountAmount,
        paymentMethod,
        channel,
      });
      if (result.success) {
        setReceipt(result);
      } else {
        setSaleError(result.error);
      }
    });
  }

  function handleNewSale() {
    setReceipt(null);
    setCart([]);
    setDiscount("");
    setSaleError(null);
    setScanError(null);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }

  return (
    <>
      {receipt && <ReceiptOverlay receipt={receipt} onNewSale={handleNewSale} />}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Product finder ────────────────────────── */}
        <div className="w-96 shrink-0 glass border-r border-white/60 flex flex-col">
          <div className="p-4 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Barcode / SKU
            </p>
            <div className="flex gap-2">
              <input
                ref={barcodeRef}
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm font-mono text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
                placeholder="Scan or type barcode…"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
              />
              <button
                onClick={handleBarcodeScan}
                className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 rounded-lg text-sm transition-colors"
              >
                Add
              </button>
            </div>
            {scanError && (
              <p className="text-xs text-red-500 mt-2">{scanError}</p>
            )}
          </div>

          <div className="p-4 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Search by name
            </p>
            <input
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
              placeholder="Product name, SKU, color…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Search results */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {searchResults.length > 0 ? (
              searchResults.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    addToCart(v);
                    setSearchQuery("");
                  }}
                  disabled={v.stock === 0}
                  className="w-full text-left px-4 py-3 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">
                        {v.product.name}
                      </p>
                      <p className="text-xs text-stone-400 font-mono mt-0.5">
                        {v.sku} · {variantLabel(v)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-rose-600">
                        {formatPrice(v.price ?? v.product.basePrice)}
                      </p>
                      <p className={`text-xs mt-0.5 ${v.stock === 0 ? "text-red-400" : "text-stone-400"}`}>
                        {v.stock === 0 ? "Out of stock" : `${v.stock} left`}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : searchQuery.trim() ? (
              <p className="px-4 py-6 text-sm text-stone-400 text-center">
                No products found.
              </p>
            ) : (
              <p className="px-4 py-6 text-xs text-stone-300 text-center">
                Search above or scan a barcode to add items.
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Cart + payment ───────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
              Cart {cart.length > 0 && `· ${cart.length} item${cart.length > 1 ? "s" : ""}`}
            </h2>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-stone-300">
                <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.938-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.variantId}
                    className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-stone-400 font-mono mt-0.5">
                        {item.sku} · {variantLabel(item)}
                      </p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-lg leading-none transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.maxStock}
                        value={item.quantity}
                        onChange={(e) =>
                          setQuantity(item.variantId, parseInt(e.target.value) || 1)
                        }
                        className="w-10 text-center text-sm font-semibold text-stone-800 border border-stone-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-rose-300"
                      />
                      <button
                        onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed text-stone-600 flex items-center justify-center text-lg leading-none transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right shrink-0 w-20">
                      <p className="text-sm font-semibold text-stone-800">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                      <p className="text-xs text-stone-400">
                        {formatPrice(item.unitPrice)} each
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.variantId)}
                      className="text-stone-300 hover:text-red-400 text-xl leading-none transition-colors ml-1 shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment panel */}
          <div className="shrink-0 glass border-t border-white/60 p-5 space-y-4">

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>Discount</span>
                  <span>− {formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-900 text-lg pt-1 border-t border-stone-100">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Discount + cashier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">
                  Discount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">
                  Cashier
                </p>
                <p className="w-full rounded-lg border border-stone-100 bg-stone-50/70 px-3 py-2 text-sm text-stone-600 truncate">
                  {cashierName}
                </p>
              </div>
            </div>

            {/* Sales channel */}
            <div className="flex gap-2">
              {(["SHOP", "ONLINE"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    channel === c
                      ? "border-violet-500 bg-violet-50 text-violet-600"
                      : "border-stone-200 text-stone-400 hover:border-stone-300"
                  }`}
                >
                  {c === "SHOP" ? "🏬 Shop" : "🌐 Online"}
                </button>
              ))}
            </div>

            {/* Payment method */}
            <div className="flex gap-2">
              {(["CASH", "CARD"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    paymentMethod === method
                      ? "border-rose-500 bg-rose-50 text-rose-600"
                      : "border-stone-200 text-stone-400 hover:border-stone-300"
                  }`}
                >
                  {method === "CASH" ? "💵 Cash" : "💳 Card"}
                </button>
              ))}
            </div>

            {saleError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {saleError}
              </p>
            )}

            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || isPending}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-base transition-colors"
            >
              {isPending ? "Processing…" : `Complete Sale · ${formatPrice(total)}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
