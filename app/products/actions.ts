'use server'

import { prisma } from "../../lib/prisma";
import { deleteImage, saveImage } from "../../lib/uploads";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/auth";

type ActionResult = { error: string } | null;

function isUniqueError(e: unknown) {
  return e instanceof Error && e.message.includes("Unique constraint");
}

export async function createSupplier(name: string): Promise<{ error: string } | { id: number }> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Supplier name is required." };

  try {
    const supplier = await prisma.supplier.create({ data: { name: trimmed } });
    revalidatePath("/products");
    return { id: supplier.id };
  } catch (e) {
    if (isUniqueError(e)) return { error: "A supplier with this name already exists." };
    return { error: "Failed to save supplier. Please try again." };
  }
}

export async function createCategory(supplierId: number, name: string): Promise<ActionResult> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Category name is required." };

  try {
    await prisma.category.create({ data: { name: trimmed, supplierId } });
  } catch (e) {
    if (isUniqueError(e)) return { error: "This supplier already has that category." };
    return { error: "Failed to save category. Please try again." };
  }

  revalidatePath("/products");
  return null;
}

function skuPart(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export async function createItem(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const categoryId = Number(formData.get("categoryId"));
  const color = String(formData.get("color") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const costPrice = parseFloat(String(formData.get("costPrice") ?? ""));
  const sellingPrice = parseFloat(String(formData.get("sellingPrice") ?? ""));
  const quantity = parseInt(String(formData.get("quantity") ?? "0"));
  const photo = formData.get("photo");

  if (!color) return { error: "Color is required." };
  if (!size) return { error: "Size is required." };
  if (isNaN(costPrice) || costPrice <= 0)
    return { error: "Cost price must be greater than 0." };
  if (isNaN(sellingPrice) || sellingPrice <= 0)
    return { error: "Selling price must be greater than 0." };
  if (isNaN(quantity) || quantity < 0) return { error: "Quantity cannot be negative." };

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, supplier: { select: { name: true } } },
  });
  if (!category) return { error: "Category not found." };

  let imageUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    try {
      imageUrl = await saveImage(photo);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to save photo." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: `${category.name} – ${color}`,
          brand: category.supplier.name,
          basePrice: sellingPrice,
          costPrice,
          imageUrl,
          categoryId: category.id,
        },
      });

      // e.g. VEST-12-M-RED — product id keeps it unique
      const variant = await tx.variant.create({
        data: {
          sku: [skuPart(category.name), product.id, skuPart(size), skuPart(color)]
            .filter(Boolean)
            .join("-"),
          size,
          color,
          stock: quantity,
          productId: product.id,
        },
      });

      if (quantity > 0) {
        await tx.stockMovement.create({
          data: {
            variantId: variant.id,
            type: "RESTOCK",
            quantity,
            reason: "Initial stock",
            reference: category.supplier.name,
          },
        });
      }
    });
  } catch {
    return { error: "Failed to save item. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/checkout");
  return null;
}

// Deletes a product with its variants and stock history. A product that has
// been sold is hidden instead, so past sales and revenue stay correct.
export async function deleteProduct(
  productId: number
): Promise<{ error: string } | { hidden: boolean }> {
  await requireAdmin();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { imageUrl: true, variants: { select: { id: true, _count: { select: { saleItems: true } } } } },
  });
  if (!product) return { error: "Product not found." };

  const hasSales = product.variants.some((v) => v._count.saleItems > 0);
  try {
    if (hasSales) {
      await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    } else {
      await prisma.$transaction([
        prisma.stockMovement.deleteMany({
          where: { variantId: { in: product.variants.map((v) => v.id) } },
        }),
        prisma.product.delete({ where: { id: productId } }), // variants cascade
      ]);
      if (product.imageUrl) await deleteImage(product.imageUrl);
    }
  } catch {
    return { error: "Failed to delete product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/checkout");
  return { hidden: hasSales };
}

// Upload a product photo from the new/edit product forms; returns its URL.
export async function uploadProductPhoto(
  formData: FormData
): Promise<{ error: string } | { url: string }> {
  await requireAdmin();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo first." };
  try {
    return { url: await saveImage(photo) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save photo." };
  }
}
