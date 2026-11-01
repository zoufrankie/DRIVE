import "dotenv/config";
import path from "path";
import { PrismaClient } from "./app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Deleting ALL shop data (clients, vehicles, invoices, payments, appointments)...");
  console.log("User and Settings are preserved.");

  const payments = await prisma.payment.deleteMany({});
  const lines = await prisma.invoiceLine.deleteMany({});
  const invoices = await prisma.invoice.deleteMany({});
  const owners = await prisma.vehicleOwner.deleteMany({});
  const vehicles = await prisma.vehicle.deleteMany({});
  const clients = await prisma.client.deleteMany({});
  const appointments = await prisma.appointment.deleteMany({});

  console.log(`  Deleted ${payments.count} payments`);
  console.log(`  Deleted ${lines.count} invoice lines`);
  console.log(`  Deleted ${invoices.count} invoices`);
  console.log(`  Deleted ${owners.count} vehicle ownerships`);
  console.log(`  Deleted ${vehicles.count} vehicles`);
  console.log(`  Deleted ${clients.count} clients`);
  console.log(`  Deleted ${appointments.count} appointments`);
  console.log("");
  console.log("Done. Shop is empty.");
}

main().finally(() => prisma.$disconnect());