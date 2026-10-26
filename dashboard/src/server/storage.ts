import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import { ApiError } from "@/server/http";

export const maxDocumentBytes = 8 * 1024 * 1024;
const signatures = [
  { mime: "application/pdf", ext: "pdf", match: (b: Buffer) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
  { mime: "image/jpeg", ext: "jpg", match: (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", match: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
];

export function documentRoot() {
  const configured = process.env.PRIVATE_DOCUMENT_DIR;
  if (process.env.NODE_ENV === "production" && (!configured || !isAbsolute(configured))) throw new ApiError(503, "Private storage is not configured");
  const root = resolve(/* turbopackIgnore: true */ configured ?? "./private-documents");
  const publicRoot = resolve(process.cwd(), "public");
  if (root === publicRoot || root.startsWith(publicRoot + sep)) throw new ApiError(503, "Invalid private storage path");
  return root;
}

export function validateDocument(buffer: Buffer, declaredType: string) {
  if (!buffer.length || buffer.length > maxDocumentBytes) throw new ApiError(400, "File must be between 1 byte and 8 MB");
  const found = signatures.find((item) => item.match(buffer));
  if (!found || found.mime !== declaredType) throw new ApiError(400, "Only verified PDF, JPEG, and PNG files are accepted");
  return found;
}

export function safeFilename(value: string) {
  const leaf = value.replaceAll("\\", "/").split("/").pop() ?? "document";
  return leaf.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 100).replace(/^\.+/, "") || "document";
}

export async function storeDocument(buffer: Buffer, ext: string) {
  const root = documentRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  const key = `${randomUUID()}.${ext}`;
  const handle = await open(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ root, key), "wx", 0o600);
  try { await handle.writeFile(buffer); } finally { await handle.close(); }
  return key;
}
export async function loadDocument(key: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(key)) throw new ApiError(500, "Invalid storage record");
  return readFile(/* turbopackIgnore: true */ join(documentRoot(), key));
}
export async function removeDocument(key: string) { await unlink(/* turbopackIgnore: true */ join(documentRoot(), key)).catch(() => {}); }
