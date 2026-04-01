-- AlterTable
ALTER TABLE "public"."VeriportMroReport" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailStatus" TEXT,
ADD COLUMN     "emailedAt" TIMESTAMP(3),
ADD COLUMN     "emailedTo" TEXT;
