'use server'

import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "../../lib/auth";

export type CartItemInput = {
  variantId: number;
  sku: string;
  productName: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
};

export type SaleInput = {
  items: CartItemInput[];
  discount: number;
  paymentMethod: "CASH" | "CARD";
  channel: "SHOP" | "ONLINE";
};

export type SaleSuccess = {
  success: true;
  receiptNo: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  channel: string;
  items: CartItemInput[];
};

export type SaleResult = SaleSuccess | { success: false; error: string };

export async function completeSale(input: SaleInput): Promise<SaleResult> {
  const user = await requireUser();
  if (input.items.length === 0)
    return { success: false, error: "Cart is empty." };
  if (input.items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1))
    return { success: false, error: "Invalid quantity." };
  const discount = Math.max(0, Number(input.discount) || 0);

  // Re-check stock for every variant (prevent overselling)
  const variantIds = input.items.map((i) => i.variantId);
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      stock: true,
      sku: true,
      price: true,
      product: { select: { basePrice: true } },
    },
  });

  for (const item of input.items) {
    const v = variants.find((v) => v.id === item.variantId);
    if (!v) return { success: false, error: `Variant ${item.sku} not found.` };
    if (v.stock < item.quantity)
      return {
        success: false,
        error: `Not enough stock for ${item.sku}. Only ${v.stock} left.`,
      };
    // Use the price from the database, not what the browser sent
    item.unitPrice = v.price ?? v.product.basePrice;
  }

  // Generate receipt number: R-YYYYMMDD-NNNN
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.sale.count({
    where: { createdAt: { gte: dayStart } },
  });
  const receiptNo = `R-${dateStr}-${String(todayCount + 1).padStart(4, "0")}`;

  const subtotal = input.items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const total = Math.max(0, subtotal - discount);

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        receiptNo,
        total,
        discount,
        paymentMethod: input.paymentMethod,
        channel: input.channel === "ONLINE" ? "ONLINE" : "SHOP",
        cashierName: user.name,
        items: {
          create: input.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.unitPrice * i.quantity,
          })),
        },
      },
    });

    // Deduct stock and log movements
    for (const item of input.items) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          type: "SALE",
          quantity: -item.quantity,
          reference: sale.receiptNo,
        },
      });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/analytics");

  return {
    success: true,
    receiptNo,
    subtotal,
    discount,
    total,
    paymentMethod: input.paymentMethod,
    channel: input.channel === "ONLINE" ? "ONLINE" : "SHOP",
    items: input.items,
  };
}
