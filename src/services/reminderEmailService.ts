import { PrismaClient } from "@prisma/client";
import { decrypt } from "../utils/encryption";
import { sendMail } from "../utils/sendemail";
import { buildTestReminderEmail } from "../utils/transactionalEmailTemplates";

const prisma = new PrismaClient();

export async function sendUpcomingTestReminders(hoursAhead: number) {
  const now = new Date();
  const until = new Date(now.getTime() + Math.max(1, hoursAhead) * 60 * 60 * 1000);

  const registrations = await prisma.donorRegistration.findMany({
    where: {
      isDelete: false,
      registrationExpirationDate: {
        gte: now,
        lte: until,
      },
      reminderEmailSentAt: null,
    } as any,
    select: {
      id: true,
      donorNameFirst: true,
      donorNameLast: true,
      donorEmail: true,
      panelId: true,
      registrationExpirationDate: true,
    },
    take: 500,
  });

  const results: Array<{ id: number; status: "SENT" | "FAILED"; error?: string }> = [];

  for (const reg of registrations) {
    try {
      const to = decrypt(reg.donorEmail);
      if (!to || !to.includes("@")) {
        throw new Error("Missing/invalid donor email");
      }

      const donorFirstName = decrypt(reg.donorNameFirst);
      const donorLastName = decrypt(reg.donorNameLast);
      const tpl = buildTestReminderEmail({
        donorFirstName,
        donorLastName,
        registrationId: reg.id,
        registrationExpirationDate: reg.registrationExpirationDate,
        panelCode: reg.panelId,
      });
      const sendResult = await sendMail(to, tpl.subject, tpl.text);

      await prisma.donorRegistration.update({
        where: { id: reg.id },
        data: {
          reminderEmailSentAt: new Date(),
          reminderEmailStatus: "SENT",
          reminderEmailError: sendResult?.messageId ? `providerId:${sendResult.messageId}` : null,
        } as any,
      });
      results.push({ id: reg.id, status: "SENT" });
    } catch (err: any) {
      await prisma.donorRegistration.update({
        where: { id: reg.id },
        data: {
          reminderEmailStatus: "FAILED",
          reminderEmailError: err?.message ?? String(err),
        } as any,
      });
      results.push({ id: reg.id, status: "FAILED", error: err?.message ?? String(err) });
    }
  }

  return {
    scanned: registrations.length,
    sent: results.filter((r) => r.status === "SENT").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    results,
  };
}

