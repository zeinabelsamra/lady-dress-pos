import { prisma } from "../../lib/prisma";
import InventoryClient from "./InventoryClient";
import type { Metadata } from "next";
import { requireAdmin } from "../../lib/auth";

export const metadata: Metadata = { title: "Inventory — The Lady Dress" };

export default async function InventoryPage() {
  await requireAdmin();
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        variants: {
          orderBy: [{ size: "asc" }, { color: "asc" }],
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            barcode: true,
            stock: true,
            lowStockAt: true,
          },
        },
      },
    }),
    prisma.stockMovement.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        variant: {
          select: {
            sku: true,
            product: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const allVariants = products.flatMap((p) => p.variants);
  const lowStockCount = allVariants.filter(
    (v) => v.stock > 0 && v.stock <= v.lowStockAt
  ).length;
  const outOfStockCount = allVariants.filter((v) => v.stock === 0).length;

  // Serialize dates — Client Components can't receive Date objects from Server Components
  const serializedMovements = movements.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <InventoryClient
      products={products}
      movements={serializedMovements}
      lowStockCount={lowStockCount}
      outOfStockCount={outOfStockCount}
    />
  );
}
