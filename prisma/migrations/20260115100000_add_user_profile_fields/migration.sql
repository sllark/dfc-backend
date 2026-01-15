-- Add optional profile fields to User
ALTER TABLE "public"."User"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "dateOfBirth" TIMESTAMP(3);

