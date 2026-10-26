import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const db = new PrismaClient();
async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const name = process.env.OWNER_FULL_NAME?.trim();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !name || !password || password.length < 16 || !/[a-z]/i.test(password) || !/\d/.test(password) || !/[^a-z\d]/i.test(password)) {
    throw new Error("Set OWNER_EMAIL, OWNER_FULL_NAME, and a unique OWNER_PASSWORD of at least 16 characters with letter, number, and symbol.");
  }
  if (await db.user.count({ where: { role: "OWNER" } })) throw new Error("An owner already exists. Bootstrap is one-time only.");
  const existing = await db.user.findUnique({ where: { emailNormalized: email } });
  if (existing) throw new Error("This email already belongs to an account.");
  const user = await db.user.create({ data: { fullName: name, email, emailNormalized: email, passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 }), role: "OWNER" } });
  await db.auditLog.create({ data: { actorUserId: user.id, action: "OWNER_BOOTSTRAPPED", resourceType: "User", resourceId: user.id } });
  console.info(`Owner account created: ${user.id}`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Bootstrap failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
