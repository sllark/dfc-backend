-- AlterTable
ALTER TABLE "public"."VeriportMroReport" ADD COLUMN     "donorEmailEnc" TEXT,
ADD COLUMN     "pdfError" TEXT,
ADD COLUMN     "pdfFormat" TEXT,
ADD COLUMN     "pdfPublicId" TEXT,
ADD COLUMN     "pdfResourceType" TEXT,
ADD COLUMN     "pdfStatus" TEXT,
ADD COLUMN     "pdfType" TEXT,
ADD COLUMN     "pdfUploadedAt" TIMESTAMP(3),
ADD COLUMN     "pdfVersion" INTEGER,
ADD COLUMN     "recipientUserId" INTEGER;
