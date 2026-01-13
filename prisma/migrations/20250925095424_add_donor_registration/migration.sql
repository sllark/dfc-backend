-- CreateEnum
CREATE TYPE "public"."RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'RESUBMITTED');

-- CreateTable
CREATE TABLE "public"."DonorRegistration" (
    "id" SERIAL NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "donorNameFirst" TEXT NOT NULL,
    "donorNameLast" TEXT NOT NULL,
    "donorNameMiddleInitial" TEXT,
    "reasonForTest" TEXT,
    "donorStateOfResidence" TEXT NOT NULL,
    "donorSSN" TEXT,
    "donorId" TEXT,
    "registrationExpirationDate" TIMESTAMP(3) NOT NULL,
    "panelId" TEXT,
    "labcorpRegistrationNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,
    "createdByIP" TEXT NOT NULL,
    "updatedByIP" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonorRegistration_pkey" PRIMARY KEY ("id")
);
