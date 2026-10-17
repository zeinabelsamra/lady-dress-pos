'use server'

import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { freezeFeeHistory, isMonthKey } from "../../lib/expenses";
import { requireAdmin } from "../../lib/auth";

type ActionResult = { error: string } | null;

function checkAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount < 0) return "Amount must be 0 or more.";
  return null;
}

function done(): ActionResult {
  revalidatePath("/expenses");
  revalidatePath("/analytics");
  return null;
}

// Change what a constant fee costs in one month only (e.g. this month's electricity).
export async function setFeeForMonth(
  feeId: number,
  month: string,
  amount: number
): Promise<ActionResult> {
  await requireAdmin();
  const err = checkAmount(amount);
  if (err) return { error: err };
  if (!isMonthKey(month)) return { error: "Invalid month." };

  const fee = await prisma.monthlyFee.findUnique({ where: { id: feeId } });
  if (!fee) return { error: "Fee not found." };

  await prisma.expense.upsert({
    where: { month_feeId: { month, feeId } },
    create: { month, feeId, name: fee.name, amount },
    update: { amount },
  });
  return done();
}

// Drop a one-month change so the month uses the fee's every-month amount again.
export async function resetFeeForMonth(feeId: number, month: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.expense.deleteMany({ where: { feeId, month } });
  return done();
}

// Change a fee's every-month amount from `fromMonth` onward. Earlier months
// keep the old amount, and `fromMonth` drops any one-month change.
export async function setFeeEveryMonth(
  feeId: number,
  amount: number,
  fromMonth: string
): Promise<ActionResult> {
  await requireAdmin();
  const err = checkAmount(amount);
  if (err) return { error: err };
  if (!isMonthKey(fromMonth)) return { error: "Invalid month." };

  await freezeFeeHistory(feeId, fromMonth);
  await prisma.$transaction([
    prisma.monthlyFee.update({ where: { id: feeId }, data: { amount } }),
    prisma.expense.deleteMany({ where: { feeId, month: fromMonth } }),
  ]);
  return done();
}

export async function renameFee(feeId: number, name: string): Promise<ActionResult> {
  await requireAdmin();
  if (!name.trim()) return { error: "Name is required." };
  await prisma.$transaction([
    prisma.monthlyFee.update({ where: { id: feeId }, data: { name: name.trim() } }),
    prisma.expense.updateMany({ where: { feeId }, data: { name: name.trim() } }),
  ]);
  return done();
}

// Stop a constant fee from `fromMonth` onward; earlier months keep it.
export async function stopFee(feeId: number, fromMonth: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isMonthKey(fromMonth)) return { error: "Invalid month." };
  const fee = await prisma.monthlyFee.findUnique({ where: { id: feeId } });
  if (!fee) return { error: "Fee not found." };

  if (fee.startMonth >= fromMonth) {
    await prisma.monthlyFee.delete({ where: { id: feeId } });
    return done();
  }

  await freezeFeeHistory(feeId, fromMonth);
  await prisma.$transaction([
    prisma.monthlyFee.update({ where: { id: feeId }, data: { endMonth: fromMonth } }),
    prisma.expense.deleteMany({ where: { feeId, month: { gte: fromMonth } } }),
  ]);
  return done();
}

// Add a new fee: repeating every month from `month`, or a one-off for `month` only.
export async function addFee(
  name: string,
  amount: number,
  month: string,
  everyMonth: boolean
): Promise<ActionResult> {
  await requireAdmin();
  const err = checkAmount(amount);
  if (err) return { error: err };
  if (!name.trim()) return { error: "Name is required." };
  if (!isMonthKey(month)) return { error: "Invalid month." };

  if (everyMonth) {
    await prisma.monthlyFee.create({ data: { name: name.trim(), amount, startMonth: month } });
  } else {
    await prisma.expense.create({ data: { name: name.trim(), amount, month } });
  }
  return done();
}

export async function updateExtra(id: number, amount: number): Promise<ActionResult> {
  await requireAdmin();
  const err = checkAmount(amount);
  if (err) return { error: err };
  await prisma.expense.update({ where: { id }, data: { amount } });
  return done();
}

export async function deleteExtra(id: number): Promise<ActionResult> {
  await requireAdmin();
  await prisma.expense.delete({ where: { id } });
  return done();
}
