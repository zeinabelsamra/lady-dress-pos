import { prisma } from "../../../lib/prisma";
import ProductForm from "./ProductForm";
import type { Metadata } from "next";
import { requireAdmin } from "../../../lib/auth";

export const metadata: Metadata = { title: "New Product — The Lady Dress" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category
    .findMany({
      orderBy: [{ supplier: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, supplier: { select: { name: true } } },
    })
    .then((cats) => cats.map((c) => ({ id: c.id, name: `${c.supplier.name} › ${c.name}` })));

  return (
    <div className="flex-1 overflow-y-auto">
      <ProductForm categories={categories} />
    </div>
  );
}
