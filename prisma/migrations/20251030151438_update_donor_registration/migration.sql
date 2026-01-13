/*
  Warnings:

  - Added the required column `donorSex` to the `DonorRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DonorRegistration" ADD COLUMN     "donorSex" TEXT NOT NULL,
ADD COLUMN     "splitSpecimenRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testingAuthority" TEXT;
