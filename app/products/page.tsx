import { prisma } from "../../lib/prisma";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import AddSupplierForm from "./AddSupplierForm";
import CategoryTiles from "./CategoryTiles";
import { requireAdmin } from "../../lib/auth";

export const metadata: Metadata = { title: "Products — The Lady Dress" };

type SearchParams = Promise<{ supplier?: string }>;

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function PlaceholderThumbnail({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-100 via-fuchsia-50 to-violet-100">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="w-10 h-10 text-rose-200"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"
        />
      </svg>
      <span className="mt-2 text-xs font-medium text-rose-300 text-center px-2 leading-tight">
        {name.slice(0, 12)}
      </span>
    </div>
  );
}

type GridProduct = {
  id: number;
  name: string;
  brand: string | null;
  basePrice: number;
  imageUrl: string | null;
  variants: { stock: number; price: number | null }[];
};

function ProductGrid({ products }: { products: GridProduct[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => {
        const totalStock = product.variants.reduce(
          (sum, v) => sum + v.stock,
          0
        );
        const variantPrice = product.variants.find((v) => v.price != null)?.price;
        const displayPrice = variantPrice ?? product.basePrice;

        const stockStatus =
          totalStock === 0
            ? "out"
            : totalStock <= 5
            ? "low"
            : "ok";

        return (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group bg-white rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden hover:shadow-lg hover:shadow-fuchsia-200/60 hover:-translate-y-0.5 transition-all duration-200"
          >
            {/* Thumbnail */}
            <div className="relative aspect-square overflow-hidden">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              ) : (
                <PlaceholderThumbnail name={product.name} />
              )}

              {/* Stock badge */}
              {stockStatus === "out" && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Out of stock
                </span>
              )}
              {stockStatus === "low" && (
                <span className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Low stock
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              {product.brand && (
                <p className="text-[10px] text-stone-400 uppercase tracking-wide truncate">
                  {product.brand}
                </p>
              )}
              <p className="text-sm font-medium text-stone-800 leading-snug mt-0.5 truncate">
                {product.name}
              </p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-sm font-semibold text-rose-600">
                  {formatPrice(displayPrice)}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    stockStatus === "out"
                      ? "text-red-400"
                      : stockStatus === "low"
                      ? "text-amber-500"
                      : "text-stone-400"
                  }`}
                >
                  {totalStock} in stock
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const productInclude = {
  where: { isActive: true },
  orderBy: { name: "asc" },
  include: { variants: { select: { stock: true, price: true } } },
} as const;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { supplier: supplierParam } = await searchParams;
  const selectedSupplierId = supplierParam ? parseInt(supplierParam) : null;

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      categories: {
        orderBy: { name: "asc" },
        include: { products: productInclude },
      },
    },
  });

  const countItems = (s: (typeof suppliers)[number]) =>
    s.categories.reduce((n, c) => n + c.products.length, 0);

  const selected = suppliers.find((s) => s.id === selectedSupplierId) ?? null;
  const totalProducts = suppliers.reduce((n, s) => n + countItems(s), 0);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Supplier sidebar ── */}
      <aside className="w-56 shrink-0 glass border-r border-white/60 overflow-y-auto py-4">
        <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          Suppliers
        </p>

        <Link
          href="/products"
          className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg mx-2 transition-colors ${
            !selected
              ? "bg-rose-50 text-rose-600 font-medium"
              : "text-stone-600 hover:bg-white/70"
          }`}
        >
          <span>All Products</span>
          <span className="text-xs text-stone-400">{totalProducts}</span>
        </Link>

        {suppliers.map((s) => (
          <Link
            key={s.id}
            href={`/products?supplier=${s.id}`}
            className={`flex items-center justify-between gap-2 px-4 py-2 text-sm rounded-lg mx-2 transition-colors ${
              selected?.id === s.id
                ? "bg-rose-50 text-rose-600 font-medium"
                : "text-stone-600 hover:bg-white/70"
            }`}
          >
            <span className="truncate">{s.name}</span>
            <span className="text-xs text-stone-400">{countItems(s)}</span>
          </Link>
        ))}

        <AddSupplierForm />
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <>
            <div className="flex items-baseline gap-2 mb-4">
              <h1 className="page-title">{selected.name}</h1>
              <span className="text-xs text-stone-400">
                {selected.categories.length}{" "}
                {selected.categories.length === 1 ? "category" : "categories"}
              </span>
            </div>

            <CategoryTiles
              supplier={{ id: selected.id, name: selected.name }}
              categories={selected.categories.map((c) => ({
                id: c.id,
                name: c.name,
                itemCount: c.products.length,
              }))}
            />

            {selected.categories.map((cat) =>
              cat.products.length === 0 ? null : (
                <section key={cat.id} className="mb-10">
                  <div className="flex items-baseline gap-2 mb-4">
                    <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
                      {cat.name}
                    </h2>
                    <span className="text-xs text-stone-400">
                      {cat.products.length} {cat.products.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <ProductGrid products={cat.products} />
                </section>
              )
            )}
          </>
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <Link
                href="/products/new"
                className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                + New Product
              </Link>
            </div>

            {suppliers.map((s) =>
              s.categories.map((cat) =>
                cat.products.length === 0 ? null : (
                  <section key={cat.id} className="mb-10">
                    <div className="flex items-baseline gap-2 mb-4">
                      <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
                        <Link href={`/products?supplier=${s.id}`} className="text-stone-400 hover:text-rose-600">
                          {s.name}
                        </Link>
                        <span className="text-stone-300 mx-1.5">›</span>
                        {cat.name}
                      </h2>
                      <span className="text-xs text-stone-400">
                        {cat.products.length} {cat.products.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <ProductGrid products={cat.products} />
                  </section>
                )
              )
            )}

            {totalProducts === 0 && (
              <div className="flex items-center justify-center h-64 text-stone-400 text-sm">
                No products yet. Add a supplier on the left to get started.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
