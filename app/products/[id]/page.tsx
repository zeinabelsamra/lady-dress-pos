import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "../../../lib/auth";
import DeleteProductButton from "./DeleteProductButton";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    select: { name: true },
  });
  return { title: product ? `${product.name} — The Lady Dress` : "Product Not Found" };
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StockBadge({ stock, lowStockAt }: { stock: number; lowStockAt: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Out of stock
      </span>
    );
  if (stock <= lowStockAt)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      {stock} in stock
    </span>
  );
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const productId = parseInt(id);

  if (isNaN(productId)) notFound();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { include: { supplier: true } },
      variants: {
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
    },
  });

  if (!product) notFound();

  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const lowStockCount = product.variants.filter(
    (v) => v.stock > 0 && v.stock <= v.lowStockAt
  ).length;
  const outOfStockCount = product.variants.filter((v) => v.stock === 0).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-stone-400 mb-6">
          <Link href="/products" className="hover:text-stone-600 transition-colors">
            Products
          </Link>
          <span>/</span>
          <Link
            href={`/products?supplier=${product.category.supplierId}`}
            className="hover:text-stone-600 transition-colors"
          >
            {product.category.supplier.name}
          </Link>
          <span>/</span>
          <span>{product.category.name}</span>
          <span>/</span>
          <span className="text-stone-600 font-medium">{product.name}</span>
        </nav>

        {/* Product header */}
        <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden mb-6">
          <div className="flex flex-col sm:flex-row">

            {/* Thumbnail */}
            <div className="relative w-full sm:w-64 aspect-square sm:aspect-auto shrink-0 bg-gradient-to-br from-rose-50 to-stone-100">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="256px"
                  unoptimized
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={0.75}
                    className="w-20 h-20 text-rose-200"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {product.brand && (
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
                      {product.brand}
                    </p>
                  )}
                  <h1 className="text-2xl font-semibold text-stone-900 leading-tight">
                    {product.name}
                  </h1>
                  <p className="text-sm text-stone-400 mt-1">
                    {product.category.supplier.name} · {product.category.name}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/products/${product.id}/edit`}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Edit
                  </Link>
                  <DeleteProductButton productId={product.id} name={product.name} />
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      product.isActive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-stone-500 mt-4 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Pricing */}
              <div className="flex items-baseline gap-6 mt-5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">
                    Selling Price
                  </p>
                  <p className="text-2xl font-bold text-rose-600">
                    {formatPrice(product.basePrice)}
                  </p>
                </div>
                {product.costPrice != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">
                      Cost Price
                    </p>
                    <p className="text-lg font-medium text-stone-500">
                      {formatPrice(product.costPrice)}
                    </p>
                  </div>
                )}
                {product.costPrice != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">
                      Margin
                    </p>
                    <p className="text-lg font-medium text-emerald-600">
                      {Math.round(
                        ((product.basePrice - product.costPrice) / product.basePrice) * 100
                      )}
                      %
                    </p>
                  </div>
                )}
              </div>

              {/* Stock summary pills */}
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1 rounded-full">
                  {product.variants.length} variants
                </span>
                <span className="bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1 rounded-full">
                  {totalStock} total in stock
                </span>
                {lowStockCount > 0 && (
                  <span className="bg-amber-50 text-amber-600 text-xs font-medium px-3 py-1 rounded-full">
                    {lowStockCount} low stock
                  </span>
                )}
                {outOfStockCount > 0 && (
                  <span className="bg-red-50 text-red-600 text-xs font-medium px-3 py-1 rounded-full">
                    {outOfStockCount} out of stock
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Variants table */}
        <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">Variants</h2>
            <Link
              href={`/inventory?product=${product.id}`}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
            >
              Manage stock →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-violet-50">
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    SKU
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Size
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Color
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Barcode
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Price
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Stock
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {product.variants.map((variant) => (
                  <tr
                    key={variant.id}
                    className={`transition-colors hover:bg-stone-50 ${
                      variant.stock === 0 ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-6 py-3.5 font-mono text-xs text-stone-500">
                      {variant.sku}
                    </td>
                    <td className="px-4 py-3.5 text-stone-700">
                      {variant.size ?? <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {variant.color ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-stone-200 shrink-0"
                            style={{ backgroundColor: variant.color.toLowerCase() }}
                          />
                          {variant.color}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-stone-400">
                      {variant.barcode ?? <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-stone-700">
                      {variant.price != null ? (
                        <span className="text-rose-600">{formatPrice(variant.price)}</span>
                      ) : (
                        <span className="text-stone-400 text-xs">base</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StockBadge stock={variant.stock} lowStockAt={variant.lowStockAt} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/checkout?variant=${variant.id}`}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          variant.stock === 0
                            ? "text-stone-300 cursor-not-allowed pointer-events-none"
                            : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                        }`}
                      >
                        Sell
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
