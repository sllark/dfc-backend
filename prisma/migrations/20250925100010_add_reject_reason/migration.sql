/*
  Warnings:

  - You are about to drop the column `accountNumber` on the `DonorRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `donorId` on the `DonorRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `donorNameMiddleInitial` on the `DonorRegistration` table. All the data in the column will be lost.
  - The `status` column on the `DonorRegistration` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `panelId` on table `DonorRegistration` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."DonorRegistration" DROP COLUMN "accountNumber",
DROP COLUMN "donorId",
DROP COLUMN "donorNameMiddleInitial",
ADD COLUMN     "rejectReason" TEXT,
ALTER COLUMN "panelId" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
