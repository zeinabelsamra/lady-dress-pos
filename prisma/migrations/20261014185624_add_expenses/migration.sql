-- CreateTable
CREATE TABLE "MonthlyFee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "feeId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "MonthlyFee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Expense_month_idx" ON "Expense"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_month_feeId_key" ON "Expense"("month", "feeId");
