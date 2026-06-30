-- CreateEnum
CREATE TYPE "PosOrderType" AS ENUM ('DINE_IN', 'TAKEOUT', 'DELIVERY');

-- CreateTable
CREATE TABLE "PosOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "posOrderId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "orderType" "PosOrderType" NOT NULL DEFAULT 'TAKEOUT',
    "status" TEXT NOT NULL DEFAULT 'Paid',
    "storeRef" TEXT,
    "storeName" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "changeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "businessDate" DATE,
    "placedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "modifiers" JSONB,

    CONSTRAINT "PosOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receivedAmount" DECIMAL(12,2),
    "changeAmount" DECIMAL(12,2),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosOrder_posOrderId_key" ON "PosOrder"("posOrderId");

-- CreateIndex
CREATE INDEX "PosOrder_companyId_idx" ON "PosOrder"("companyId");

-- CreateIndex
CREATE INDEX "PosOrder_companyId_businessDate_idx" ON "PosOrder"("companyId", "businessDate");

-- CreateIndex
CREATE INDEX "PosOrder_companyId_orderNo_idx" ON "PosOrder"("companyId", "orderNo");

-- CreateIndex
CREATE INDEX "PosOrderItem_orderId_idx" ON "PosOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "PosOrderItem_itemId_idx" ON "PosOrderItem"("itemId");

-- CreateIndex
CREATE INDEX "PosPayment_orderId_idx" ON "PosPayment"("orderId");

-- AddForeignKey
ALTER TABLE "PosOrderItem" ADD CONSTRAINT "PosOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
