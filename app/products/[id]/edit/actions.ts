'use server'

import { prisma } from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth";
import { normalizeImageUrl } from "../../../../lib/uploads";

export type VariantEditInput = {
  id?: number;        // undefined = new variant
  sku: string;
  size: string;
  color: string;
  barcode: string;
  price: string;      // empty = no override
  stock: number;      // only used for new variants
};

export type ProductEditInput = {
  name: string;
  brand: string;
  description: string;
  categoryId: number;
  basePrice: number;
  costPrice: string;
  imageUrl: string;
  isActive: boolean;
  variants: VariantEditInput[];
  deletedVariantIds: number[];
};

type ActionResult = { error: string } | null;

export async function updateProduct(
  productId: number,
  data: ProductEditInput
): Promise<ActionResult> {
  await requireAdmin();
  if (!data.name.trim()) return { error: "Product name is required." };
  if (!data.categoryId) return { error: "Please select a category." };
  if (!data.basePrice || data.basePrice <= 0)
    return { error: "Selling price must be greater than 0." };

  const image = normalizeImageUrl(data.imageUrl);
  if ("error" in image) return { error: image.error };

  const activeVariants = data.variants.filter((v) => v.sku.trim());
  if (activeVariants.length === 0)
    return { error: "At least one variant with a SKU is required." };

  const skus = activeVariants.map((v) => v.sku.trim());
  if (new Set(skus).size !== skus.length)
    return { error: "Variant SKUs must be unique." };

  try {
    await prisma.$transaction(async (tx) => {
      // Update product fields
      await tx.product.update({
        where: { id: productId },
        data: {
          name: data.name.trim(),
          brand: data.brand.trim() || null,
          description: data.description.trim() || null,
          categoryId: data.categoryId,
          basePrice: data.basePrice,
          costPrice: data.costPrice ? parseFloat(data.costPrice) : null,
          imageUrl: image.url,
          isActive: data.isActive,
        },
      });

      // Delete removed variants (only those without sale history)
      if (data.deletedVariantIds.length > 0) {
        // Delete stock movements first (safe to remove audit trail on deletion)
        await tx.stockMovement.deleteMany({
          where: { variantId: { in: data.deletedVariantIds } },
        });
        await tx.variant.deleteMany({
          where: {
            id: { in: data.deletedVariantIds },
            saleItems: { none: {} }, // safety: only delete if no sales
          },
        });
      }

      // Update existing variants
      for (const v of activeVariants.filter((v) => v.id != null)) {
        await tx.variant.update({
          where: { id: v.id },
          data: {
            sku: v.sku.trim(),
            size: v.size.trim() || null,
            color: v.color.trim() || null,
            barcode: v.barcode.trim() || null,
            price: v.price ? parseFloat(v.price) : null,
          },
        });
      }

      // Create new variants
      const newVariants = activeVariants.filter((v) => v.id == null);
      if (newVariants.length > 0) {
        await tx.variant.createMany({
          data: newVariants.map((v) => ({
            productId,
            sku: v.sku.trim(),
            size: v.size.trim() || null,
            color: v.color.trim() || null,
            barcode: v.barcode.trim() || null,
            price: v.price ? parseFloat(v.price) : null,
            stock: v.stock,
          })),
        });
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") && msg.includes("sku"))
      return { error: "One or more SKUs already exist in the database." };
    if (msg.includes("Unique constraint") && msg.includes("barcode"))
      return { error: "One or more barcodes already exist in the database." };
    return { error: "Failed to save changes. Please try again." };
  }

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  redirect(`/products/${productId}`);
}
