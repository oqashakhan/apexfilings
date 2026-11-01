// Shared by the Next.js server and the Node startup check.
const address = "[A-Z0-9._%+-]+@apexfilings\\.com";
const bare = new RegExp(`^(${address})$`, "i");
const branded = new RegExp(`^(?:Apex Filings|"Apex Filings")\\s*<(${address})>$`, "i");

export function senderAddress(value) {
  const input = value?.trim() ?? "";
  return bare.exec(input)?.[1] ?? branded.exec(input)?.[1] ?? null;
}

export function resendSender(value) {
  const email = senderAddress(value);
  return email ? `Apex Filings <${email}>` : null;
}
