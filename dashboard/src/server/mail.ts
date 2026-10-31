import "server-only";
import type { Prisma } from "@prisma/client";

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function emailHtml(title: string, paragraphs: string[], link?: { label: string; href: string }) {
  const content = paragraphs.map((line) => `<p style="margin:0 0 16px;line-height:1.6;color:#344054">${escape(line)}</p>`).join("");
  const button = link ? `<p style="margin:28px 0"><a href="${escape(link.href)}" style="display:inline-block;padding:13px 20px;border-radius:9px;background:#F04623;color:#fff;text-decoration:none;font-weight:700">${escape(link.label)}</a></p>` : "";
  const logo = process.env.APP_ORIGIN ? `<img src="${escape(process.env.APP_ORIGIN.replace(/\/$/, ""))}/apex-icon.png" alt="" width="32" height="32" style="display:inline-block;width:32px;height:32px;vertical-align:middle;margin-right:10px" />` : "";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:16px;background:#f8fafc;font-family:Arial,sans-serif;color:#171717"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8ebef;border-radius:16px;overflow:hidden"><div style="padding:22px 24px;border-bottom:3px solid #F04623;font-size:20px;font-weight:800;color:#171717">${logo}Apex Filings</div><div style="padding:26px 24px"><h1 style="font-size:23px;line-height:1.3;margin:0 0 20px;color:#171717">${escape(title)}</h1>${content}${button}<p style="font-size:13px;color:#667085">Questions? Contact <a href="mailto:info@apexfilings.com">info@apexfilings.com</a>.</p></div><div style="padding:16px 24px;background:#fff8f5;color:#667085;font-size:12px">Apex Filings · Business formation services</div></div></body></html>`;
}

export async function queueEmail(tx: Prisma.TransactionClient, eventKey: string, toEmail: string, subject: string, html: string) {
  await tx.emailOutbox.create({ data: { eventKey, toEmail, subject, html } });
}

export async function queueNotification(tx: Prisma.TransactionClient, eventKey: string, userId: string, type: string, title: string, message: string, relatedEntity?: string) {
  await tx.notification.create({ data: { eventKey, userId, type, title, message, relatedEntity } });
}
