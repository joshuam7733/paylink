import { db } from "./db";

/**
 * Phase 1 has no email provider. Messages are stored in the DevEmail table (viewable at /dev/outbox
 * in development) and logged to the server console. Swap this function for a real provider later.
 */
export async function sendEmail(msg: { to: string; subject: string; body: string }): Promise<void> {
  await db.devEmail.create({ data: msg });
  if (process.env.NODE_ENV !== "test") {
    console.info(`[mail] to=${msg.to} subject="${msg.subject}" (stored in /dev/outbox)`);
  }
}
