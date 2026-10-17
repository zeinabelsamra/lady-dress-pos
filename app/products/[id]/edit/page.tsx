import { prisma } from "../../../../lib/prisma";
import { notFound } from "next/navigation";
import EditProductForm from "./EditProductForm";
import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/auth";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    select: { name: true },
  });
  return { title: product ? `Edit ${product.name} — The Lady Dress` : "Not Found" };
}

export default async function EditProductPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) notFound();

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          orderBy: [{ size: "asc" }, { color: "asc" }],
          include: {
            _count: { select: { saleItems: true } },
          },
        },
      },
    }),
    prisma.category
      .findMany({
        orderBy: [{ supplier: { name: "asc" } }, { name: "asc" }],
        select: { id: true, name: true, supplier: { select: { name: true } } },
      })
      .then((cats) => cats.map((c) => ({ id: c.id, name: `${c.supplier.name} › ${c.name}` }))),
  ]);

  if (!product) notFound();

  const initial = {
    name: product.name,
    brand: product.brand ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId,
    basePrice: product.basePrice,
    costPrice: product.costPrice,
    imageUrl: product.imageUrl ?? "",
    isActive: product.isActive,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      barcode: v.barcode,
      price: v.price,
      stock: v.stock,
      hasSales: v._count.saleItems > 0,
    })),
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <EditProductForm
        productId={productId}
        categories={categories}
        initial={initial}
      />
    </div>
  );
}
