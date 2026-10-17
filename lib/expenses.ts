import { prisma } from "./prisma";

// Months are stored as "YYYY-MM" strings so they compare correctly as text.

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isMonthKey(s: string | undefined): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

export function monthStart(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export function monthLabel(month: string) {
  return monthStart(month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export type FeeRow = {
  feeId: number;
  name: string;
  amount: number;          // amount counted for this month
  defaultAmount: number;   // the fee's every-month amount
  overridden: boolean;     // this month has its own amount
};

export type ExtraRow = { id: number; name: string; amount: number };

export async function getMonthExpenses(month: string) {
  const [fees, extras] = await Promise.all([
    prisma.monthlyFee.findMany({
      where: {
        OR: [
          {
            startMonth: { lte: month },
            OR: [{ endMonth: null }, { endMonth: { gt: month } }],
          },
          { expenses: { some: { month } } },
        ],
      },
      orderBy: { id: "asc" },
      include: { expenses: { where: { month } } },
    }),
    prisma.expense.findMany({
      where: { month, feeId: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const feeRows: FeeRow[] = fees.map((f) => {
    const entry = f.expenses[0];
    return {
      feeId: f.id,
      name: entry?.name ?? f.name,
      amount: entry?.amount ?? f.amount,
      defaultAmount: f.amount,
      overridden: !!entry,
    };
  });
  const extraRows: ExtraRow[] = extras.map((e) => ({ id: e.id, name: e.name, amount: e.amount }));

  const feesTotal = feeRows.reduce((s, r) => s + r.amount, 0);
  const extrasTotal = extraRows.reduce((s, r) => s + r.amount, 0);

  return { fees: feeRows, extras: extraRows, feesTotal, extrasTotal, total: feesTotal + extrasTotal };
}

// Freeze a fee's current name/amount into every earlier month that has no
// row of its own, so changing or stopping the fee doesn't rewrite history.
export async function freezeFeeHistory(feeId: number, beforeMonth: string) {
  const fee = await prisma.monthlyFee.findUnique({
    where: { id: feeId },
    include: { expenses: { select: { month: true } } },
  });
  if (!fee) return;

  const existing = new Set(fee.expenses.map((e) => e.month));
  const stop = fee.endMonth && fee.endMonth < beforeMonth ? fee.endMonth : beforeMonth;
  const data: { month: string; name: string; amount: number; feeId: number }[] = [];
  for (let m = fee.startMonth; m < stop; m = addMonths(m, 1)) {
    if (!existing.has(m)) data.push({ month: m, name: fee.name, amount: fee.amount, feeId });
  }
  if (data.length) await prisma.expense.createMany({ data });
}
