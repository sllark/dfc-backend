type EmailTemplate = { subject: string; text: string };

function safeStr(v: any, fallback = "N/A") {
  const s = v == null ? "" : String(v).trim();
  return s || fallback;
}

export function buildVeriportReportEmail(args: {
  kind: "READY" | "UPDATED";
  reportId: string;
  revision: string | null;
  overallResult?: string | null;
  portalBaseUrl?: string | null;
}): EmailTemplate {
  const reportId = safeStr(args.reportId);
  const revision = safeStr(args.revision, "N/A");
  const overallResult = safeStr(args.overallResult, "Available in portal");

  // Prefer sending users to the portal to authenticate and fetch the PDF via signed URL.
  // Avoid embedding long-lived signed Cloudinary URLs in email (they should be short-lived).
  const base = args.portalBaseUrl ? String(args.portalBaseUrl).replace(/\/+$/, "") : "";
  const portalLink = base ? `${base}/b2c/reports/${encodeURIComponent(reportId)}` : null;

  const subject =
    args.kind === "UPDATED"
      ? `Update: your drug test report was revised (Report ${reportId})`
      : `Your drug test results are ready (Report ${reportId})`;

  const header =
    `Dear Client,\n\n` +
    (args.kind === "UPDATED"
      ? `A revised version of your drug test report is now available.\n\n`
      : `Your drug test report is now available.\n\n`);

  const details =
    `Report ID: ${reportId}\n` +
    `Revision: ${revision}\n` +
    `Overall result: ${overallResult}\n\n`;

  const access =
    portalLink
      ? `To view and download your official PDF report, please sign in to your Drug Free Compliance portal:\n${portalLink}\n\n`
      : `To view and download your official PDF report, please sign in to your Drug Free Compliance portal.\n\n`;

  const privacy =
    `For your privacy, we do not include detailed medical information in email.\n\n`;

  const footer =
    `If you have questions or believe you received this message in error, please contact Drug Free Compliance support.\n\n` +
    `Sincerely,\n` +
    `Drug Free Compliance\n`;

  return { subject, text: header + details + access + privacy + footer };
}

