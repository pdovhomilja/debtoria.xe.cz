import type { Language } from "@prisma/client";
import { db } from "@/lib/db";
import type { EmailProvider } from "@/lib/providers/types";

export const fakeEmailProvider: EmailProvider = {
  async send(i) {
    const user = await db.user.findUnique({ where: { email: i.to } });
    if (!user) {
      console.log(`[fake-email] to=${i.to} template=${i.template}`);
      return;
    }
    await db.notification.create({
      data: {
        userId: user.id,
        channel: "email",
        template: i.template,
        language: i.language.toUpperCase() as Language,
        payload: i.payload as object,
        sentAt: new Date(),
      },
    });
  },
};
