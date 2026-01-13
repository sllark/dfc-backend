/*
  Warnings:

  - Added the required column `userId` to the `DonorRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DonorRegistration" ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "donorRegistrationId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."DonorRegistration" ADD CONSTRAINT "DonorRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_donorRegistrationId_fkey" FOREIGN KEY ("donorRegistrationId") REFERENCES "public"."DonorRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
