-- AlterTable
ALTER TABLE "public"."DonorRegistration" ADD COLUMN     "accountNoSnapshot" TEXT,
ADD COLUMN     "panelRefId" INTEGER,
ADD COLUMN     "panelTestCodeSnapshot" TEXT,
ADD COLUMN     "priceCentsSnapshot" INTEGER;

-- CreateTable
CREATE TABLE "public"."Panel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "accountNo" TEXT NOT NULL,
    "panelTestCode" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TestItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PanelTestItem" (
    "id" SERIAL NOT NULL,
    "panelId" INTEGER NOT NULL,
    "testItemId" INTEGER NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelTestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Panel_slug_key" ON "public"."Panel"("slug");

-- CreateIndex
CREATE INDEX "Panel_slug_idx" ON "public"."Panel"("slug");

-- CreateIndex
CREATE INDEX "Panel_panelTestCode_idx" ON "public"."Panel"("panelTestCode");

-- CreateIndex
CREATE UNIQUE INDEX "TestItem_slug_key" ON "public"."TestItem"("slug");

-- CreateIndex
CREATE INDEX "TestItem_slug_idx" ON "public"."TestItem"("slug");

-- CreateIndex
CREATE INDEX "PanelTestItem_panelId_idx" ON "public"."PanelTestItem"("panelId");

-- CreateIndex
CREATE INDEX "PanelTestItem_testItemId_idx" ON "public"."PanelTestItem"("testItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PanelTestItem_panelId_testItemId_key" ON "public"."PanelTestItem"("panelId", "testItemId");

-- AddForeignKey
ALTER TABLE "public"."DonorRegistration" ADD CONSTRAINT "DonorRegistration_panelRefId_fkey" FOREIGN KEY ("panelRefId") REFERENCES "public"."Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PanelTestItem" ADD CONSTRAINT "PanelTestItem_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "public"."Panel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PanelTestItem" ADD CONSTRAINT "PanelTestItem_testItemId_fkey" FOREIGN KEY ("testItemId") REFERENCES "public"."TestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
