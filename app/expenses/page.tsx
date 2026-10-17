import { prisma } from "../../lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import {
  addMonths,
  getMonthExpenses,
  isMonthKey,
  monthKey,
  monthLabel,
  monthStart,
} from "../../lib/expenses";
import ExpensesClient from "./ExpensesClient";
import { requireAdmin } from "../../lib/auth";

export const metadata: Metadata = { title: "Expenses — The Lady Dress" };

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { month: monthParam } = await searchParams;
  const thisMonth = monthKey(new Date());
  const month = isMonthKey(monthParam) ? monthParam : thisMonth;

  const [expenses, salesAgg] = await Promise.all([
    getMonthExpenses(month),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: monthStart(month), lt: monthStart(addMonths(month, 1)) },
      },
      _sum: { total: true },
    }),
  ]);

  const sales = salesAgg._sum.total ?? 0;
  const net = sales - expenses.total;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* ── Header + month picker ─────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Expenses</h1>
          <div className="flex items-center gap-1">
            <Link
              href={`/expenses?month=${addMonths(month, -1)}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
              aria-label="Previous month"
            >
              ‹
            </Link>
            <span className="text-sm font-semibold text-stone-700 w-36 text-center">
              {monthLabel(month)}
            </span>
            <Link
              href={`/expenses?month=${addMonths(month, 1)}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
              aria-label="Next month"
            >
              ›
            </Link>
            {month !== thisMonth && (
              <Link
                href="/expenses"
                className="ml-2 text-xs text-rose-500 hover:text-rose-700 font-medium"
              >
                This month
              </Link>
            )}
          </div>
        </div>

        {/* ── Summary ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border bg-gradient-to-br from-sky-100 to-cyan-50 border-sky-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Sales</p>
            <p className="text-3xl font-bold mt-2 text-stone-900">{formatPrice(sales)}</p>
            <p className="text-xs mt-1 text-stone-400">shop + online</p>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-amber-100 to-orange-50 border-amber-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Expenses</p>
            <p className="text-3xl font-bold mt-2 text-stone-900">{formatPrice(expenses.total)}</p>
            <p className="text-xs mt-1 text-stone-400">
              fees {formatPrice(expenses.feesTotal)} · extra {formatPrice(expenses.extrasTotal)}
            </p>
          </div>
          <div
            className={`rounded-2xl border p-5 ${
              net >= 0
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent shadow-emerald-200 shadow-sm"
                : "bg-gradient-to-br from-red-500 to-rose-600 border-transparent shadow-red-200 shadow-sm"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Left after expenses
            </p>
            <p className="text-3xl font-bold mt-2 text-white">{formatPrice(net)}</p>
            <p className="text-xs mt-1 text-white/70">sales − expenses</p>
          </div>
        </div>

        <ExpensesClient
          key={month}
          month={month}
          monthName={monthLabel(month)}
          fees={expenses.fees}
          extras={expenses.extras}
          feesTotal={expenses.feesTotal}
          extrasTotal={expenses.extrasTotal}
        />
      </div>
    </div>
  );
}
