-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "minMonthlyShifts" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "maxMonthlyShifts" INTEGER;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN "requiredHeadcount" INTEGER NOT NULL DEFAULT 1;
