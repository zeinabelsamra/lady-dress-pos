'use client'

import { useState, useTransition } from "react";
import type { ExtraRow, FeeRow } from "../../lib/expenses";
import {
  addFee,
  deleteExtra,
  resetFeeForMonth,
  setFeeForMonth,
  renameFee,
  setFeeEveryMonth,
  stopFee,
  updateExtra,
} from "./actions";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

const inputCls =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition";

// ── Amount input that saves on Enter / leaving the field ──
function AmountInput({
  value,
  onSave,
}: {
  value: number;
  onSave: (amount: number) => Promise<{ error: string } | null>;
}) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    const amount = parseFloat(text);
    if (text.trim() === "" || amount === value) {
      setText(String(value));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSave(amount);
      if (result) {
        setError(result.error);
        setText(String(value));
      }
    });
  }

  return (
    <div className="text-right">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
        <input
          type="number"
          min="0"
          step="any"
          value={text}
          disabled={isPending}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={`${inputCls} w-32 pl-7 text-right font-semibold disabled:opacity-50`}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ── One constant fee ─────────────────────────────────────
function FeeItem({ fee, month, monthName }: { fee: FeeRow; month: string; monthName: string }) {
  const [text, setText] = useState(String(fee.amount));
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(fee.name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amount = parseFloat(text);
  const changed = text.trim() !== "" && amount !== fee.amount;

  function run(action: () => Promise<{ error: string } | null>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result) setError(result.error);
      else onOk?.();
    });
  }

  function handleRemove() {
    if (!confirm(`Stop "${fee.name}" from ${monthName} onward?
Earlier months keep it.`)) return;
    run(() => stopFee(fee.feeId, month));
  }

  return (
    <div className={`px-6 py-3 ${isPending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => renameFee(fee.feeId, name), () => setRenaming(false));
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                className={`${inputCls} flex-1 py-1.5`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(false);
                  setName(fee.name);
                }}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                Cancel
              </button>
            </form>
          ) : (
            <p className="text-sm font-medium text-stone-800 truncate">{fee.name}</p>
          )}
          <p className="text-xs text-stone-400 mt-0.5">
            Every month: {formatPrice(fee.defaultAmount)}
            {fee.overridden && fee.amount !== fee.defaultAmount && (
              <>
                {" · "}
                <span className="text-amber-600">changed for {monthName} only</span>
                {" · "}
                <button
                  onClick={() => run(() => resetFeeForMonth(fee.feeId, month))}
                  className="text-rose-500 hover:text-rose-700 font-medium"
                >
                  use {formatPrice(fee.defaultAmount)}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
          <input
            type="number"
            min="0"
            step="any"
            value={text}
            disabled={isPending}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && changed) run(() => setFeeEveryMonth(fee.feeId, amount, month));
              if (e.key === "Escape") setText(String(fee.amount));
            }}
            className={`${inputCls} w-32 pl-7 text-right font-semibold disabled:opacity-50`}
          />
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setRenaming(true)}
            className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 rounded-md hover:bg-stone-100"
          >
            Rename
          </button>
          <button
            onClick={handleRemove}
            className="text-stone-300 hover:text-red-400 text-xl leading-none px-1"
            aria-label={`Remove ${fee.name}`}
          >
            ×
          </button>
        </div>
      </div>

      {changed && (
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs text-stone-400 mr-1">Save {formatPrice(amount)} for:</span>
          <button
            onClick={() => run(() => setFeeEveryMonth(fee.feeId, amount, month))}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            Every month
          </button>
          <button
            onClick={() => run(() => setFeeForMonth(fee.feeId, month, amount))}
            className="border border-stone-200 hover:border-stone-300 text-stone-600 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            Only {monthName}
          </button>
          <button
            onClick={() => setText(String(fee.amount))}
            className="text-xs text-stone-400 hover:text-stone-600 px-1"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1 text-right">{error}</p>}
    </div>
  );
}

// ── One extra (one-off) fee ──────────────────────────────
function ExtraItem({ extra }: { extra: ExtraRow }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className={`flex items-center gap-4 px-6 py-3 ${isPending ? "opacity-50" : ""}`}>
      <p className="flex-1 min-w-0 text-sm font-medium text-stone-800 truncate">{extra.name}</p>
      <AmountInput key={extra.amount} value={extra.amount} onSave={(a) => updateExtra(extra.id, a)} />
      <button
        onClick={() => {
          if (confirm(`Delete "${extra.name}"?`))
            startTransition(async () => { await deleteExtra(extra.id); });
        }}
        className="text-stone-300 hover:text-red-400 text-xl leading-none px-1 shrink-0"
        aria-label={`Delete ${extra.name}`}
      >
        ×
      </button>
    </div>
  );
}

// ── Add a fee ────────────────────────────────────────────
function AddFeeForm({ month, monthName }: { month: string; monthName: string }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [everyMonth, setEveryMonth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addFee(name, parseFloat(amount), month, everyMonth);
      if (result) {
        setError(result.error);
        return;
      }
      setName("");
      setAmount("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 p-6">
      <h2 className="text-sm font-semibold text-stone-700 mb-4">Add a fee</h2>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Fee name (e.g. Internet, Repairs…)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
          <input
            type="number"
            min="0"
            step="any"
            className={`${inputCls} w-full sm:w-32 pl-7 text-right`}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {([
          [false, `Only ${monthName}`],
          [true, "Every month"],
        ] as const).map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setEveryMonth(value)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
              everyMonth === value
                ? "border-rose-500 bg-rose-50 text-rose-600"
                : "border-stone-200 text-stone-400 hover:border-stone-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !name.trim() || amount === ""}
        className="mt-4 w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        {isPending ? "Adding…" : "Add fee"}
      </button>
    </form>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function ExpensesClient({
  month,
  monthName,
  fees,
  extras,
  feesTotal,
  extrasTotal,
}: {
  month: string;
  monthName: string;
  fees: FeeRow[];
  extras: ExtraRow[];
  feesTotal: number;
  extrasTotal: number;
}) {
  return (
    <div className="space-y-6">
      {/* Constant fees */}
      <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">
            Monthly fees
            <span className="ml-2 text-xs font-normal text-stone-400">repeat every month</span>
          </h2>
          <span className="text-sm font-semibold text-stone-800">{formatPrice(feesTotal)}</span>
        </div>
        {fees.length === 0 ? (
          <p className="px-6 py-8 text-sm text-stone-400 text-center">
            No monthly fees for {monthName}.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {fees.map((f) => (
              <FeeItem
                key={`${f.feeId}-${f.amount}-${f.defaultAmount}`}
                fee={f}
                month={month}
                monthName={monthName}
              />
            ))}
          </div>
        )}
      </div>

      {/* Extra fees */}
      <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">
            Extra fees
            <span className="ml-2 text-xs font-normal text-stone-400">{monthName} only</span>
          </h2>
          <span className="text-sm font-semibold text-stone-800">{formatPrice(extrasTotal)}</span>
        </div>
        {extras.length === 0 ? (
          <p className="px-6 py-8 text-sm text-stone-400 text-center">No extra fees this month.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {extras.map((e) => (
              <ExtraItem key={e.id} extra={e} />
            ))}
          </div>
        )}
      </div>

      <AddFeeForm month={month} monthName={monthName} />
    </div>
  );
}
