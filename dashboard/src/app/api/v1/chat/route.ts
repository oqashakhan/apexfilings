import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { actor, assertVerifiedClient, ApiError, body, checkOrigin, handleError, json } from "@/server/http";
import { queueNotification } from "@/server/mail";

const access = (user: Awaited<ReturnType<typeof actor>>) =>
  user.role === "OWNER" ? {} : user.role === "STAFF" ? { assignedToId: user.id } : { customerId: user.id };
async function userFor(request: NextRequest) {
  const user = await actor(request);
  if (!["OWNER", "STAFF", "CLIENT"].includes(user.role)) throw new ApiError(403, "Not authorized");
  assertVerifiedClient(user);
  return user;
}
const serialize = (value: unknown) => JSON.parse(JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v));
function chatError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) {
    return json({ error: "Messages are temporarily unavailable. Please contact support." }, 503);
  }
  return handleError(error);
}

export async function GET(request: NextRequest) {
  try {
    const user = await userFor(request);
    const params = request.nextUrl.searchParams;
    const id = params.get("id");
    if (id) {
      const chat = await db.chatConversation.findFirst({ where: { id, ...access(user) }, include: {
        customer: { select: { fullName: true, clientReference: true } },
        company: { select: { preferredName: true } },
      } });
      if (!chat) throw new ApiError(404, "Conversation not found");
      const after = params.get("after"), before = params.get("before");
      if ((after && !/^\d{1,18}$/.test(after)) || (before && !/^\d{1,18}$/.test(before)) || (after && before)) throw new ApiError(400, "Invalid message cursor");
      const messages = await db.chatMessage.findMany({
        where: { conversationId: id, ...(after ? { seq: { gt: BigInt(after) } } : before ? { seq: { lt: BigInt(before) } } : {}) },
        orderBy: { seq: after ? "asc" : "desc" }, take: 51,
        select: { seq: true, body: true, createdAt: true, authorId: true, author: { select: { role: true, fullName: true } } },
      });
      const hasMore = messages.length > 50;
      const page = messages.slice(0, 50);
      return json(serialize({ messages: after ? page : page.reverse(), hasMore, userId: user.id,
        chat: { id: chat.id, customer: chat.customer, company: chat.company, assignedToId: chat.assignedToId, closedAt: chat.closedAt } }));
    }
    const search = params.get("search")?.trim().slice(0, 100) ?? "";
    const page = z.coerce.number().int().min(1).max(10000).parse(params.get("page") ?? "1");
    const filter = z.enum(["all", "assigned", "closed"]).parse(params.get("filter") ?? "all");
    const unread = params.get("unread") === "true";
    const scope = user.role === "OWNER" ? Prisma.empty : user.role === "STAFF" ? Prisma.sql`AND c."assignedToId" = ${user.id}` : Prisma.sql`AND c."customerId" = ${user.id}`;
    const term = search.replace(/[\\%_]/g, "\\$&");
    const matching = search && user.role !== "CLIENT" ? Prisma.sql`AND (u."fullName" ILIKE ${"%" + term + "%"} OR u."clientReference" = ${search} OR co."preferredName" ILIKE ${"%" + term + "%"})` : Prisma.empty;
    const state = filter === "assigned" ? Prisma.sql`AND c."assignedToId" IS NOT NULL` : filter === "closed" ? Prisma.sql`AND c."closedAt" IS NOT NULL` : Prisma.empty;
    const unreadFilter = unread ? Prisma.sql`AND EXISTS (SELECT 1 FROM "ChatMessage" m JOIN "User" author ON author.id=m."authorId" WHERE m."conversationId"=c.id AND m.seq > ${user.role === "CLIENT" ? Prisma.sql`c."clientReadSeq"` : Prisma.sql`c."teamReadSeq"`} AND author.role ${user.role === "CLIENT" ? Prisma.sql`IN ('OWNER','STAFF')` : Prisma.sql`= 'CLIENT'`})` : Prisma.empty;
    const rows = await db.$queryRaw<{id:string}[]>`SELECT c.id FROM "ChatConversation" c JOIN "User" u ON u.id=c."customerId" LEFT JOIN "Company" co ON co.id=c."companyId" WHERE TRUE ${scope} ${matching} ${state} ${unreadFilter} ORDER BY c."updatedAt" DESC,c.id DESC OFFSET ${(page-1)*25} LIMIT 26`;
    const hasMore = rows.length > 25;
    const ids = rows.slice(0,25).map(row => row.id);
    const chats = await db.chatConversation.findMany({ where: { id: { in: ids }, ...access(user) }, include: { customer: { select: { fullName: true, clientReference: true } }, company: { select: { preferredName: true } }, assignedTo: { select: { fullName: true } }, messages: { orderBy: { seq: "desc" }, take: 1, select: { body: true, seq: true } } } });
    chats.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
    const counts = await Promise.all(chats.map(chat => db.chatMessage.count({ where: { conversationId: chat.id, seq: { gt: user.role === "CLIENT" ? chat.clientReadSeq : chat.teamReadSeq }, author: { role: user.role === "CLIENT" ? { in: ["OWNER", "STAFF"] } : "CLIENT" } } })));
    const staff = user.role === "OWNER" ? await db.user.findMany({ where: { role: "STAFF", status: "ACTIVE" }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }) : [];
    return json(serialize({ chats: chats.map((c, i) => ({ id: c.id, customer: c.customer, company: c.company, assignedToId: c.assignedToId, assignedTo: c.assignedTo, closedAt: c.closedAt, lastMessage: c.messages[0]?.body ?? "", unread: counts[i] })), staff, page, hasMore }));
  } catch (error) { return chatError(error); }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const user = await userFor(request);
    const input = z.discriminatedUnion("action", [
      z.object({ action: z.literal("start"), companyId: z.string().nullable() }),
      z.object({ action: z.literal("send"), id: z.string(), key: z.uuid(), message: z.string().trim().min(1).max(4000) }),
      z.object({ action: z.literal("read"), id: z.string(), through: z.string().regex(/^\d{1,18}$/) }),
      z.object({ action: z.literal("assign"), id: z.string(), staffId: z.string().nullable() }),
      z.object({ action: z.literal("close"), id: z.string(), closed: z.boolean() }),
    ]).parse(await body(request));
    if (input.action === "start") {
      if (user.role !== "CLIENT") throw new ApiError(403, "Not authorized");
      if (input.companyId && !await db.company.count({ where: { id: input.companyId, customerId: user.id } })) throw new ApiError(404, "Company not found");
      const chat = await db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"chat-start:" + user.id + ":" + (input.companyId ?? "")}))`;
        return await tx.chatConversation.findFirst({ where: { customerId: user.id, companyId: input.companyId, closedAt: null } }) ?? tx.chatConversation.create({ data: { customerId: user.id, companyId: input.companyId } });
      });
      return json({ id: chat.id });
    }
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ChatConversation" WHERE id=${input.id} FOR UPDATE`;
      const chat = await tx.chatConversation.findFirst({ where: { id: input.id, ...access(user) } });
      if (!chat) throw new ApiError(404, "Conversation not found");
      if (input.action === "send") {
        const key = user.id + ":" + input.key;
        const old = await tx.chatMessage.findUnique({ where: { clientKey: key } });
        if (old) {
          if (old.conversationId !== chat.id || old.body !== input.message) throw new ApiError(409, "Retry key already used");
          return { sent: true, message: { seq: old.seq.toString(), body: old.body, createdAt: old.createdAt, authorId: user.id, author: { role: user.role, fullName: user.fullName } } };
        }
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"chat-rate:" + user.id}))`;
        if (await tx.chatMessage.count({ where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 30) throw new ApiError(429, "Please wait before sending another message");
        if (chat.closedAt) throw new ApiError(409, "This conversation is closed");
        const message = await tx.chatMessage.create({ data: { conversationId: chat.id, authorId: user.id, clientKey: key, body: input.message } });
        await tx.chatConversation.update({ where: { id: chat.id }, data: { updatedAt: new Date() } });
        const recipients = user.role === "CLIENT" ? await tx.user.findMany({ where: { status: "ACTIVE", OR: [{ role: "OWNER" }, ...(chat.assignedToId ? [{ id: chat.assignedToId, role: "STAFF" as const }] : [])] }, select: { id: true } }) : [{ id: chat.customerId }];
        for (const recipient of recipients) await queueNotification(tx, `chat:${message.seq}:${recipient.id}`, recipient.id, "CHAT_MESSAGE", "New message", "You have a new support message.", chat.id);
        return { sent: true, message: { seq: message.seq.toString(), body: message.body, createdAt: message.createdAt, authorId: user.id, author: { role: user.role, fullName: user.fullName } } };
      }
      if (input.action === "read") {
        const through = BigInt(input.through);
        const message = await tx.chatMessage.findFirst({ where: { conversationId: chat.id, seq: { lte: through } }, orderBy: { seq: "desc" }, select: { seq: true } });
        if (message) await tx.chatConversation.update({ where: { id: chat.id }, data: user.role === "CLIENT" ? { clientReadSeq: { set: message.seq > chat.clientReadSeq ? message.seq : chat.clientReadSeq } } : { teamReadSeq: { set: message.seq > chat.teamReadSeq ? message.seq : chat.teamReadSeq } } });
        const notices = await tx.notification.findMany({
          where: { type: "CHAT_MESSAGE", relatedEntity: chat.id, readAt: null,
            ...(user.role === "CLIENT" ? { userId: user.id } : { user: { role: { in: ["OWNER", "STAFF"] } } }) },
          select: { id: true, eventKey: true },
        });
        const readIds = notices.filter(notice => {
          const match = notice.eventKey?.match(/^chat:(\d+):/);
          return match && BigInt(match[1]) <= through;
        }).map(notice => notice.id);
        await tx.notification.updateMany({ where: { id: { in: readIds } }, data: { readAt: new Date() } });
        return { read: true };
      }
      if (input.action === "assign") {
        if (user.role !== "OWNER") throw new ApiError(403, "Not authorized");
        if (input.staffId && !await tx.user.count({ where: { id: input.staffId, role: "STAFF", status: "ACTIVE" } })) throw new ApiError(400, "Choose active staff");
        await tx.chatConversation.update({ where: { id: chat.id }, data: { assignedToId: input.staffId } });
      } else {
        if (user.role === "CLIENT") throw new ApiError(403, "Not authorized");
        await tx.chatConversation.update({ where: { id: chat.id }, data: { closedAt: input.closed ? new Date() : null } });
      }
      await tx.auditLog.create({ data: { actorUserId: user.id, action: input.action === "assign" ? "CHAT_ASSIGNED" : "CHAT_STATUS_CHANGED", resourceType: "ChatConversation", resourceId: chat.id } });
      return { saved: true };
    });
    return json(result);
  } catch (error) { return chatError(error); }
}
