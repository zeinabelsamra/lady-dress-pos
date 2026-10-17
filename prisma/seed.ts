import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data (in dependency order)
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();

  // ── Suppliers ──────────────────────────────
  const general = await prisma.supplier.create({ data: { name: "General" } });

  // ── Categories ──────────────────────────────
  const dresses = await prisma.category.create({
    data: { supplierId: general.id, name: "Dresses", description: "All kinds of dresses" },
  });
  const tops = await prisma.category.create({
    data: { supplierId: general.id, name: "Tops", description: "Blouses, shirts, t-shirts" },
  });
  const skirts = await prisma.category.create({
    data: { supplierId: general.id, name: "Skirts", description: "Mini, midi, and maxi skirts" },
  });
  const accessories = await prisma.category.create({
    data: { supplierId: general.id, name: "Accessories", description: "Bags, belts, scarves" },
  });

  // ── Product 1: Floral Summer Dress ──────────
  await prisma.product.create({
    data: {
      name: "Floral Summer Dress",
      description: "Light, breezy, perfect for summer",
      brand: "Zara",
      basePrice: 45.0,
      costPrice: 20.0,
      categoryId: dresses.id,
      variants: {
        create: [
          { sku: "FSD-S-RED", barcode: "1000001", size: "S", color: "Red", stock: 5 },
          { sku: "FSD-S-BLU", barcode: "1000002", size: "S", color: "Blue", stock: 3 },
          { sku: "FSD-M-RED", barcode: "1000003", size: "M", color: "Red", stock: 7 },
          { sku: "FSD-M-BLU", barcode: "1000004", size: "M", color: "Blue", stock: 4 },
          { sku: "FSD-L-RED", barcode: "1000005", size: "L", color: "Red", stock: 2 },
        ],
      },
    },
  });

  // ── Product 2: Black Evening Dress ──────────
  await prisma.product.create({
    data: {
      name: "Black Evening Dress",
      description: "Elegant black dress for special occasions",
      brand: "Mango",
      basePrice: 89.0,
      costPrice: 40.0,
      categoryId: dresses.id,
      variants: {
        create: [
          { sku: "BED-S-BLK", barcode: "2000001", size: "S", color: "Black", stock: 4 },
          { sku: "BED-M-BLK", barcode: "2000002", size: "M", color: "Black", stock: 6 },
          { sku: "BED-L-BLK", barcode: "2000003", size: "L", color: "Black", stock: 3 },
        ],
      },
    },
  });

  // ── Product 3: Silk Blouse ──────────
  await prisma.product.create({
    data: {
      name: "Silk Blouse",
      description: "Premium silk blouse",
      brand: "H&M",
      basePrice: 55.0,
      costPrice: 25.0,
      categoryId: tops.id,
      variants: {
        create: [
          { sku: "SB-S-WHT", barcode: "3000001", size: "S", color: "White", stock: 8 },
          { sku: "SB-M-WHT", barcode: "3000002", size: "M", color: "White", stock: 5 },
          { sku: "SB-S-PNK", barcode: "3000003", size: "S", color: "Pink", stock: 2 },
          { sku: "SB-M-PNK", barcode: "3000004", size: "M", color: "Pink", stock: 1 },
        ],
      },
    },
  });

  // ── Product 4: Denim Skirt ──────────
  await prisma.product.create({
    data: {
      name: "Denim Mini Skirt",
      description: "Classic denim mini skirt",
      brand: "Levi's",
      basePrice: 39.0,
      costPrice: 18.0,
      categoryId: skirts.id,
      variants: {
        create: [
          { sku: "DMS-S-BLU", barcode: "4000001", size: "S", color: "Blue", stock: 6 },
          { sku: "DMS-M-BLU", barcode: "4000002", size: "M", color: "Blue", stock: 4 },
          { sku: "DMS-L-BLU", barcode: "4000003", size: "L", color: "Blue", stock: 3 },
        ],
      },
    },
  });

  // ── Product 5: Leather Belt ──────────
  await prisma.product.create({
    data: {
      name: "Leather Belt",
      description: "Genuine leather belt",
      brand: "Generic",
      basePrice: 25.0,
      costPrice: 10.0,
      categoryId: accessories.id,
      variants: {
        create: [
          { sku: "LB-ONE-BRN", barcode: "5000001", color: "Brown", stock: 10 },
          { sku: "LB-ONE-BLK", barcode: "5000002", color: "Black", stock: 12 },
        ],
      },
    },
  });

  console.log("✅ Seeding complete!");
  console.log(`   Created 1 supplier, 4 categories, 5 products, 17 variants`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });