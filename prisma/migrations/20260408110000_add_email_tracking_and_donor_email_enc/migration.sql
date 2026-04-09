ALTER TABLE "public"."DonorRegistration"
ADD COLUMN "donorEmailEnc" TEXT,
ADD COLUMN "reminderEmailSentAt" TIMESTAMP(3),
ADD COLUMN "reminderEmailStatus" TEXT,
ADD COLUMN "reminderEmailError" TEXT;

CREATE INDEX "DonorRegistration_donorEmailEnc_idx" ON "public"."DonorRegistration"("donorEmailEnc");

ALTER TABLE "public"."Payment"
ADD COLUMN "orderEmailSentAt" TIMESTAMP(3),
ADD COLUMN "orderEmailStatus" TEXT,
ADD COLUMN "orderEmailError" TEXT,
ADD COLUMN "orderEmailProviderId" TEXT;

