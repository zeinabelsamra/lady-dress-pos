'use server'

import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/auth";

export type AdjustMode = "add" | "set";
export type MovementType = "RESTOCK" | "ADJUSTMENT";

type ActionResult = { error: string } | null;

export async function adjustStock(
  variantId: number,
  type: MovementType,
  mode: AdjustMode,
  amount: number,
  reason: string
): Promise<ActionResult> {
  await requireAdmin();
  if (isNaN(amount) || amount < 0)
    return { error: "Amount must be a positive number." };

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    select: { stock: true },
  });
  if (!variant) return { error: "Variant not found." };

  const delta = mode === "add" ? amount : amount - variant.stock;
  const newStock = variant.stock + delta;

  if (newStock < 0)
    return { error: `Cannot set stock below 0. Current stock is ${variant.stock}.` };

  await prisma.$transaction([
    prisma.variant.update({
      where: { id: variantId },
      data: { stock: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        variantId,
        type,
        quantity: delta,
        reason: reason.trim() || null,
      },
    }),
  ]);

  revalidatePath("/inventory");
  return null;
}
