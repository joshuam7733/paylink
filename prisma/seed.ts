// Seeds the one account that can't be created through the app: the administrator.
// It deliberately creates no sample transactions, so dashboards only ever show real records.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";

const db = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@paylink.test").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error("Set SEED_ADMIN_PASSWORD (at least 10 characters) in .env before seeding.");
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Administrator ${email} already exists; left unchanged.`);
    return;
  }
  await db.user.create({
    data: {
      email,
      name: "Paylink Admin",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
      isDemo: true,
    },
  });
  console.log(`Created administrator ${email}. Sign in with the password from SEED_ADMIN_PASSWORD.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
