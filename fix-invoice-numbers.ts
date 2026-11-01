import "dotenv/config";
import path from "path";
import { PrismaClient } from "./app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const all = await prisma.invoice.findMany({ select: { id: true, number: true } });

  const short = all.filter((inv) => {
    const m = inv.number.match(/^INV-(\d+)$/);
    return m && m[1].length < 6;
  });

  if (short.length === 0) {
    console.log("No short invoice numbers to fix.");
    return;
  }

  for (const inv of short) {
    const m = inv.number.match(/^INV-(\d+)$/);
    const padded = `INV-${m![1].padStart(6, "0")}`;
    const conflict = all.find((x) => x.number === padded);
    if (conflict) {
      console.log(`SKIP ${inv.number} -> ${padded} (conflicts with existing invoice)`);
      continue;
    }
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { number: padded },
    });
    console.log(`Renamed ${inv.number} -> ${padded}`);
  }

  console.log("Done.");
}

main().finally(() => prisma.$disconnect());