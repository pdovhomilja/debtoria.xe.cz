import type { Notification } from "@prisma/client";
import { db } from "@/lib/db";

export async function listNotifications(userId: string): Promise<Notification[]> {
  return db.notification.findMany({
    where: { userId, channel: "inapp" },
    orderBy: { createdAt: "desc" },
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, channel: "inapp", readAt: null } });
}

export async function markAllRead(userId: string): Promise<void> {
  await db.notification.updateMany({
    where: { userId, channel: "inapp", readAt: null },
    data: { readAt: new Date() },
  });
}
