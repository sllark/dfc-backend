/*
  Warnings:

  - Added the required column `donorDateOfBirth` to the `DonorRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DonorRegistration" ADD COLUMN     "donorDateOfBirth" TIMESTAMP(3) NOT NULL;
