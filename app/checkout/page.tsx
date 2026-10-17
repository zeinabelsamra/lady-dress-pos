import { prisma } from "../../lib/prisma";
import CheckoutClient from "./CheckoutClient";
import { requireUser } from "../../lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout — The Lady Dress" };

type SearchParams = Promise<{ variant?: string }>;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { variant } = await searchParams;
  const initialVariantId = variant ? parseInt(variant) : null;

  const variants = await prisma.variant.findMany({
    orderBy: { sku: "asc" },
    select: {
      id: true,
      sku: true,
      barcode: true,
      size: true,
      color: true,
      stock: true,
      price: true,
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          basePrice: true,
        },
      },
    },
  });

  return (
    <CheckoutClient
      cashierName={user.name}
      variants={variants}
      initialVariantId={
        initialVariantId && !isNaN(initialVariantId) ? initialVariantId : null
      }
    />
  );
}
