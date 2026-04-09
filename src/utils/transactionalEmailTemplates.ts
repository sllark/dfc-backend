type EmailTemplate = { subject: string; text: string };

function safe(value: any, fallback = "N/A") {
  const s = value == null ? "" : String(value).trim();
  return s || fallback;
}

export function buildOrderConfirmationEmail(args: {
  donorFirstName?: string | null;
  donorLastName?: string | null;
  orderId: string;
  amount: number;
  currency?: string | null;
  panelCode?: string | null;
  registrationExpirationDate?: Date | string | null;
}): EmailTemplate {
  const fullName = `${safe(args.donorFirstName, "").trim()} ${safe(args.donorLastName, "").trim()}`.trim() || "Client";
  const currency = safe(args.currency, "USD").toUpperCase();
  const amountFmt = `${currency} ${Number(args.amount || 0).toFixed(2)}`;
  const expDate =
    args.registrationExpirationDate != null
      ? new Date(args.registrationExpirationDate).toISOString().slice(0, 10)
      : "N/A";

  return {
    subject: `Order confirmation - Drug Free Compliance (Order ${args.orderId})`,
    text:
      `Dear ${fullName},\n\n` +
      `Thank you for your order. Your test request has been received successfully.\n\n` +
      `Order details:\n` +
      `- Order ID: ${safe(args.orderId)}\n` +
      `- Amount: ${amountFmt}\n` +
      `- Panel: ${safe(args.panelCode)}\n` +
      `- Registration expiration date: ${expDate}\n\n` +
      `If you have questions, please contact Drug Free Compliance support.\n\n` +
      `Sincerely,\n` +
      `Drug Free Compliance\n`,
  };
}

export function buildTestReminderEmail(args: {
  donorFirstName?: string | null;
  donorLastName?: string | null;
  registrationId: number;
  registrationExpirationDate: Date | string;
  panelCode?: string | null;
}): EmailTemplate {
  const fullName = `${safe(args.donorFirstName, "").trim()} ${safe(args.donorLastName, "").trim()}`.trim() || "Client";
  const expDate = new Date(args.registrationExpirationDate).toISOString().slice(0, 10);
  return {
    subject: `Reminder: complete your test registration (Ref ${args.registrationId})`,
    text:
      `Dear ${fullName},\n\n` +
      `This is a reminder regarding your test registration.\n\n` +
      `Reference: ${args.registrationId}\n` +
      `Panel: ${safe(args.panelCode)}\n` +
      `Registration expiration date: ${expDate}\n\n` +
      `Please complete your collection before the expiration date shown above.\n\n` +
      `If you have questions, please contact Drug Free Compliance support.\n\n` +
      `Sincerely,\n` +
      `Drug Free Compliance\n`,
  };
}

export function buildRegistrationSuccessEmail(args: {
  donorFirstName?: string | null;
  donorLastName?: string | null;
  registrationId: number;
  panelCode?: string | null;
  registrationExpirationDate?: Date | string | null;
}): EmailTemplate {
  const fullName = `${safe(args.donorFirstName, "").trim()} ${safe(args.donorLastName, "").trim()}`.trim() || "Client";
  const expDate =
    args.registrationExpirationDate != null
      ? new Date(args.registrationExpirationDate).toISOString().slice(0, 10)
      : "N/A";

  return {
    subject: `Registration successful - Drug Free Compliance (Ref ${args.registrationId})`,
    text:
      `Dear ${fullName},\n\n` +
      `Your registration has been completed successfully.\n\n` +
      `Registration details:\n` +
      `- Reference: ${args.registrationId}\n` +
      `- Panel: ${safe(args.panelCode)}\n` +
      `- Registration expiration date: ${expDate}\n\n` +
      `If you have questions, please contact Drug Free Compliance support.\n\n` +
      `Sincerely,\n` +
      `Drug Free Compliance\n`,
  };
}

