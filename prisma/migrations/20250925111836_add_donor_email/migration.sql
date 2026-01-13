/*
  Warnings:

  - Added the required column `donorEmail` to the `DonorRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DonorRegistration" ADD COLUMN     "donorEmail" TEXT NOT NULL;
