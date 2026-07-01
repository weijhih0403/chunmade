-- CreateTable
CREATE TABLE "ShiftClosingReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "reportNo" TEXT NOT NULL,
    "closingDate" DATE NOT NULL,
    "qty520" INTEGER NOT NULL DEFAULT 0,
    "qty850" INTEGER NOT NULL DEFAULT 0,
    "qty700" INTEGER NOT NULL DEFAULT 0,
    "qty500" INTEGER NOT NULL DEFAULT 0,
    "signatureData" TEXT,
    "recognizedText" TEXT,
    "signerName" TEXT,
    "matchedEmployeeId" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShiftClosingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftClosingReport_companyId_idx" ON "ShiftClosingReport"("companyId");

-- CreateIndex
CREATE INDEX "ShiftClosingReport_storeId_idx" ON "ShiftClosingReport"("storeId");

-- CreateIndex
CREATE INDEX "ShiftClosingReport_closingDate_idx" ON "ShiftClosingReport"("closingDate");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftClosingReport_companyId_reportNo_key" ON "ShiftClosingReport"("companyId", "reportNo");

-- AddForeignKey
ALTER TABLE "ShiftClosingReport" ADD CONSTRAINT "ShiftClosingReport_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
