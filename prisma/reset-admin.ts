// Reset (or create) an admin login when the password is forgotten.
// Usage: npm run reset-admin -- <name> <new-password>
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

// Same format as hashPassword() in lib/auth.ts: salt:hash (hex)
function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const [name, password] = process.argv.slice(2);
  if (!name || !password || password.length < 4) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { name: true } });
    console.log("Usage: npm run reset-admin -- <name> <new-password>   (password: 4+ characters)");
    console.log("Existing admins:", admins.map((a) => a.name).join(", ") || "(none)");
    return;
  }

  const passwordHash = hashPassword(password);
  const user = await prisma.user.upsert({
    where: { name },
    update: { passwordHash, role: "ADMIN" },
    create: { name, passwordHash, role: "ADMIN" },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } }); // log out old sessions
  console.log(`✅ Admin "${name}" password has been reset. You can log in now.`);
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
