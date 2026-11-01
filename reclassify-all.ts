import "dotenv/config";
import path from "path";
import { PrismaClient } from "./app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const CLASSIFIER_URL = process.env.CLASSIFIER_URL ?? "http://localhost:8001";

async function classify(text: string): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const res = await fetch(`${CLASSIFIER_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.category ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const lines = await prisma.invoiceLine.findMany({
    select: { id: true, description: true, category: true },
  });
  console.log(`Reclassifying ${lines.length} lines...`);

  let changed = 0;
  for (const line of lines) {
    const cat = await classify(line.description);
    if (cat && cat !== line.category) {
      await prisma.invoiceLine.update({
        where: { id: line.id },
        data: { category: cat },
      });
      console.log(`  "${line.description.slice(0, 40)}" ${line.category ?? "null"} -> ${cat}`);
      changed++;
    }
  }
  console.log(`\nDone. ${changed} lines changed.`);
}

main().finally(() => prisma.$disconnect());