import "dotenv/config";
import path from "path";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbPath = path.resolve(process.cwd(), "dev.db");

const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin user
  const password = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@shop.com" },
    update: {},
    create: { email: "admin@shop.com", password, name: "Admin" },
  });
  console.log("Seeded user: admin@shop.com / password123");

  // Settings singleton
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", defaultTaxRate: 10, defaultLaborRate: 100 },
  });
  console.log("Seeded settings: tax 10%, labor $100/hr");
}

main().finally(() => prisma.$disconnect());