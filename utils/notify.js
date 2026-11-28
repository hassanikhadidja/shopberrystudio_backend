const nodemailer = require("nodemailer");

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "ilyana.mokrani@gmail.com";

/**
 * Email the shop owner. Never throws — signup and messages still succeed if mail fails.
 */
async function notifyOwner({ type, name, email, subject, message }) {
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  if (!user || !pass) {
    console.error("Notification email skipped: set SMTP_USER and SMTP_PASS");
    return;
  }

  const who = String(name || "Guest").slice(0, 120);
  const address = String(email || "").slice(0, 160);
  const topic = String(subject || "").slice(0, 160);
  const text = String(message || "").slice(0, 4000);
  const title =
    type === "register" ? "Berry Studio — new user registered" : "Berry Studio — new message";
  const body =
    type === "register"
      ? `${who} (${address || "no email"}) just created an account.`
      : `${who} (${address || "guest"}) sent a message${topic ? `: ${topic}` : ""}.\n\n${text}`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_PORT || 465) !== "587",
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `"Berry Studio" <${user}>`,
      to: NOTIFY_EMAIL,
      replyTo: address || undefined,
      subject: title,
      text: body,
    });
  } catch (error) {
    console.error("Notification email failed", error.message);
  }
}

module.exports = notifyOwner;
