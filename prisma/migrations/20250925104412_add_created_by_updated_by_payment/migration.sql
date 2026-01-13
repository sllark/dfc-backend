/*
  Warnings:

  - Added the required column `createdBy` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "updatedBy" INTEGER;
