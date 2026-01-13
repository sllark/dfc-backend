-- CreateTable
CREATE TABLE "public"."Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bannerImage" TEXT,
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountNo" VARCHAR,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "public"."Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_accountNo_key" ON "public"."Service"("accountNo");

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
