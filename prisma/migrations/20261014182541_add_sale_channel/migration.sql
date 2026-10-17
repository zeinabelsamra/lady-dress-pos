-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receiptNo" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SHOP',
    "cashierName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Sale" ("cashierName", "createdAt", "discount", "id", "notes", "paymentMethod", "receiptNo", "total") SELECT "cashierName", "createdAt", "discount", "id", "notes", "paymentMethod", "receiptNo", "total" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_receiptNo_key" ON "Sale"("receiptNo");
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX "Sale_channel_idx" ON "Sale"("channel");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
