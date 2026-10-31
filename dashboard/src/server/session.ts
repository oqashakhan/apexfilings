import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { db } from "@/server/db";
import { cookieName } from "@/server/http";
import { hashToken } from "@/server/security";

export async function serverActor() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  return { id: session.user.id, fullName: session.user.fullName, email: session.user.email, role: session.user.role, emailVerified: !session.user.verificationRequired || Boolean(session.user.emailVerifiedAt) };
}

export async function requirePageRole(role: Role) {
  const user = await serverActor();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(user.role === "OWNER" ? "/admin/dashboard" : user.role === "CLIENT" ? "/client/dashboard" : "/login");
  if (role === "CLIENT" && !user.emailVerified) redirect("/verify-email");
  return user;
}
