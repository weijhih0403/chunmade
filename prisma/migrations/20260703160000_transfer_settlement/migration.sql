-- CreateEnum
CREATE TYPE "TransferSettlementStatus" AS ENUM ('PENDING', 'COLLECTED', 'PAID', 'WAIVED');

-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN "settlementAmount" DECIMAL(18,4),
ADD COLUMN "collectFromStoreId" TEXT,
ADD COLUMN "payToStoreId" TEXT,
ADD COLUMN "settlementStatus" "TransferSettlementStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "settlementNote" TEXT,
ADD COLUMN "settledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StockTransferItem" ADD COLUMN "unitCost" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "StockTransfer_completedAt_idx" ON "StockTransfer"("completedAt");
