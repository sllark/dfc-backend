-- CreateTable
CREATE TABLE "public"."VeriportSnsEvent" (
    "id" SERIAL NOT NULL,
    "snsMessageId" TEXT,
    "snsType" TEXT NOT NULL,
    "topicArn" TEXT,
    "subject" TEXT,
    "rawBody" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VeriportSnsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VeriportMroReport" (
    "id" SERIAL NOT NULL,
    "veriportReportId" BIGINT NOT NULL,
    "reportRevisionNumber" TEXT,
    "reportUpdate" BOOLEAN,
    "snsMessageId" TEXT,
    "downloadUrl" TEXT,
    "rawXml" TEXT NOT NULL,
    "parsedJson" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VeriportMroReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VeriportSnsEvent_snsMessageId_key" ON "public"."VeriportSnsEvent"("snsMessageId");

-- CreateIndex
CREATE INDEX "VeriportMroReport_veriportReportId_idx" ON "public"."VeriportMroReport"("veriportReportId");

-- CreateIndex
CREATE UNIQUE INDEX "VeriportMroReport_veriportReportId_reportRevisionNumber_key" ON "public"."VeriportMroReport"("veriportReportId", "reportRevisionNumber");
