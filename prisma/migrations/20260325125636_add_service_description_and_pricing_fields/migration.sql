-- AlterTable
ALTER TABLE "public"."DonorRegistration" ALTER COLUMN "donorSex" DROP NOT NULL,
ALTER COLUMN "donorDateOfBirth" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Service" ADD COLUMN     "description" TEXT,
ADD COLUMN     "discountedServiceFee" INTEGER,
ADD COLUMN     "originalServiceFee" INTEGER;
