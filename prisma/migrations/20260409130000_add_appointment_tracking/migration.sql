-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "donorRegistrationId" INTEGER,
    "confirmationNumber" TEXT,
    "trackingId" TEXT,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "lastLabcorpRequest" TEXT,
    "lastLabcorpResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_confirmationNumber_key" ON "Appointment"("confirmationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_userId_appointmentDate_timeSlot_locationId_serviceId_key" ON "Appointment"("userId", "appointmentDate", "timeSlot", "locationId", "serviceId");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");

-- CreateIndex
CREATE INDEX "Appointment_donorRegistrationId_idx" ON "Appointment"("donorRegistrationId");

-- CreateIndex
CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_donorRegistrationId_fkey" FOREIGN KEY ("donorRegistrationId") REFERENCES "DonorRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
