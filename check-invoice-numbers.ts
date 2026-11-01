import "dotenv/config";
import path from "path";
import { PrismaClient } from "./app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const all = await prisma.invoice.findMany({
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });

  // Find invoices with fewer than 6 digits
  const short = all.filter((inv) => {
    const m = inv.number.match(/^INV-(\d+)$/);
    return m && m[1].length < 6;
  });

  console.log(`Total invoices: ${all.length}`);
  console.log(`Invoices with < 6 digits: ${short.length}`);
  for (const inv of short) {
    const m = inv.number.match(/^INV-(\d+)$/);
    const padded = `INV-${m![1].padStart(6, "0")}`;
    const conflict = all.find((x) => x.number === padded);
    console.log(`  ${inv.number} -> ${padded}${conflict ? " [CONFLICT with existing]" : " [safe]"}`);
  }
}

main().finally(() => prisma.$disconnect());