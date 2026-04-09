import { PrismaClient } from "@prisma/client";

type ReportForAccess = {
  recipientUserId: number | null;
  donorEmailEnc: string | null;
};

/** ADMIN, linked recipient, or donor email matches logged-in user's encrypted email. */
export async function canAccessVeriportReport(
  prisma: PrismaClient,
  report: ReportForAccess,
  userId: number,
  role: string | undefined
): Promise<boolean> {
  if (role === "ADMIN" || role === "SUPERVISOR" || role === "MODERATOR") return true;
  if (report.recipientUserId === userId) return true;
  if (report.donorEmailEnc) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (u?.email && u.email === report.donorEmailEnc) return true;
  }
  return false;
}
