'use server'

import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/auth";
import { normalizeImageUrl } from "../../../lib/uploads";

export type VariantInput = {
  sku: string;
  size: string;
  color: string;
  barcode: string;
  stock: number;
  price: string; // empty string = no override
};

export type ProductInput = {
  name: string;
  brand: string;
  description: string;
  categoryId: number;
  basePrice: number;
  costPrice: string; // empty string = null
  imageUrl: string;
  variants: VariantInput[];
};

type ActionResult = { error: string } | null;

export async function createProduct(data: ProductInput): Promise<ActionResult> {
  await requireAdmin();
  // Validate required fields
  if (!data.name.trim()) return { error: "Product name is required." };
  if (!data.categoryId) return { error: "Please select a category." };
  const image = normalizeImageUrl(data.imageUrl);
  if ("error" in image) return { error: image.error };
  if (!data.basePrice || data.basePrice <= 0)
    return { error: "Selling price must be greater than 0." };
  if (data.variants.length === 0)
    return { error: "Add at least one variant." };

  const emptySkus = data.variants.filter((v) => !v.sku.trim());
  if (emptySkus.length > 0) return { error: "Every variant needs a SKU." };

  const skus = data.variants.map((v) => v.sku.trim());
  if (new Set(skus).size !== skus.length)
    return { error: "Variant SKUs must be unique." };

  let newId: number;

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name.trim(),
        brand: data.brand.trim() || null,
        description: data.description.trim() || null,
        categoryId: data.categoryId,
        basePrice: data.basePrice,
        costPrice: data.costPrice ? parseFloat(data.costPrice) : null,
        imageUrl: image.url,
        variants: {
          create: data.variants.map((v) => ({
            sku: v.sku.trim(),
            size: v.size.trim() || null,
            color: v.color.trim() || null,
            barcode: v.barcode.trim() || null,
            stock: v.stock,
            price: v.price ? parseFloat(v.price) : null,
          })),
        },
      },
    });
    newId = product.id;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") && msg.includes("sku"))
      return { error: "One or more SKUs already exist in the database." };
    if (msg.includes("Unique constraint") && msg.includes("barcode"))
      return { error: "One or more barcodes already exist in the database." };
    return { error: "Failed to save product. Please try again." };
  }

  revalidatePath("/products");
  redirect(`/products/${newId}`);
}
