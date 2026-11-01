import "dotenv/config";
import path from "path";
import { PrismaClient } from "./app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const FIRST_NAMES = ["John", "Sarah", "Mike", "Emma", "David", "Jessica", "Chris", "Amanda", "Robert", "Lisa", "Michael", "Jennifer", "Daniel", "Michelle", "Tom"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson"];

const VEHICLES = [
  { make: "Toyota", model: "Camry", year: 2018, type: "Sedan", engine: "2.5L I4" },
  { make: "Honda", model: "Civic", year: 2020, type: "Sedan", engine: "2.0L I4" },
  { make: "Ford", model: "F-150", year: 2019, type: "Truck", engine: "3.5L V6" },
  { make: "Chevrolet", model: "Silverado", year: 2021, type: "Truck", engine: "5.3L V8" },
  { make: "Nissan", model: "Altima", year: 2017, type: "Sedan", engine: "2.5L I4" },
  { make: "Subaru", model: "Outback", year: 2022, type: "SUV", engine: "2.5L H4" },
  { make: "Mazda", model: "CX-5", year: 2020, type: "SUV", engine: "2.5L I4" },
  { make: "Hyundai", model: "Elantra", year: 2019, type: "Sedan", engine: "2.0L I4" },
  { make: "Kia", model: "Sorento", year: 2021, type: "SUV", engine: "2.4L I4" },
  { make: "Tesla", model: "Model 3", year: 2022, type: "Sedan", engine: "EV" },
  { make: "Ram", model: "1500", year: 2019, type: "Truck", engine: "5.7L V8" },
  { make: "Jeep", model: "Wrangler", year: 2020, type: "SUV", engine: "3.6L V6" },
  { make: "Volkswagen", model: "Jetta", year: 2018, type: "Sedan", engine: "1.4L I4" },
  { make: "BMW", model: "3 Series", year: 2021, type: "Sedan", engine: "2.0L I4" },
  { make: "Mercedes", model: "C-Class", year: 2019, type: "Sedan", engine: "2.0L I4" },
];

const TEMPLATES = [
  { lines: [
    { kind: "LABOR", description: "front brake pad replacement", category: "BRAKES", cost: 40, price: 100, qty: 1, unit: "hr" },
    { kind: "PART", description: "brake pads front set", category: "BRAKES", cost: 45, price: 95, qty: 1, unit: "ea" },
    { kind: "PART", description: "brake rotor front pair", category: "BRAKES", cost: 120, price: 240, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "full synthetic oil change", category: "OIL", cost: 15, price: 40, qty: 1, unit: "hr" },
    { kind: "PART", description: "synthetic oil 5w30 5qt", category: "OIL", cost: 25, price: 45, qty: 1, unit: "ea" },
    { kind: "PART", description: "oil filter", category: "OIL", cost: 6, price: 15, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "transmission fluid service", category: "TRANSMISSION", cost: 50, price: 130, qty: 1, unit: "hr" },
    { kind: "PART", description: "transmission fluid 6qt", category: "TRANSMISSION", cost: 40, price: 80, qty: 1, unit: "ea" },
    { kind: "PART", description: "transmission filter kit", category: "TRANSMISSION", cost: 30, price: 70, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "wheel alignment service", category: "SUSPENSION", cost: 20, price: 100, qty: 1, unit: "hr" },
    { kind: "PART", description: "alignment shims", category: "SUSPENSION", cost: 10, price: 25, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "ac system diagnostic and recharge", category: "HVAC", cost: 45, price: 140, qty: 1, unit: "hr" },
    { kind: "PART", description: "r134a refrigerant", category: "HVAC", cost: 25, price: 60, qty: 2, unit: "ea" },
    { kind: "PART", description: "cabin air filter", category: "HVAC", cost: 12, price: 30, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "check engine diagnostic and spark plug replacement", category: "ENGINE", cost: 60, price: 160, qty: 1, unit: "hr" },
    { kind: "PART", description: "spark plug set", category: "ENGINE", cost: 40, price: 90, qty: 1, unit: "ea" },
    { kind: "PART", description: "ignition coil", category: "ENGINE", cost: 60, price: 120, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "tire rotation and balance", category: "TIRES", cost: 15, price: 60, qty: 1, unit: "hr" },
    { kind: "PART", description: "wheel weights", category: "TIRES", cost: 5, price: 15, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "state safety inspection", category: "INSPECTION", cost: 20, price: 45, qty: 1, unit: "hr" },
    { kind: "PART", description: "inspection sticker", category: "INSPECTION", cost: 3, price: 10, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "battery replacement", category: "ELECTRICAL", cost: 10, price: 40, qty: 1, unit: "hr" },
    { kind: "PART", description: "battery 12v 600cca", category: "ELECTRICAL", cost: 120, price: 200, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "radiator flush and coolant change", category: "COOLING", cost: 40, price: 120, qty: 1, unit: "hr" },
    { kind: "PART", description: "coolant 5qt", category: "COOLING", cost: 20, price: 45, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "catalytic converter replacement", category: "EXHAUST", cost: 60, price: 180, qty: 1, unit: "hr" },
    { kind: "PART", description: "catalytic converter", category: "EXHAUST", cost: 400, price: 700, qty: 1, unit: "ea" },
  ]},
  { lines: [
    { kind: "LABOR", description: "shock absorber replacement front", category: "SUSPENSION", cost: 60, price: 180, qty: 1, unit: "hr" },
    { kind: "PART", description: "shock absorber pair", category: "SUSPENSION", cost: 140, price: 280, qty: 1, unit: "ea" },
  ]},
];

const METHODS = ["CASH", "CARD", "CHECK", "TRANSFER"];
const TAX_RATE = 10;

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const existing = await prisma.invoice.findMany({ select: { number: true } });
  let maxNum = 0;
  for (const inv of existing) {
    const m = inv.number.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  console.log(`Existing invoices: ${existing.length}, next number: ${maxNum + 1}`);

  const now = new Date();
  const clientIds: string[] = [];
  const vehicles: { id: string; clientId: string }[] = [];

  console.log("Creating clients and vehicles...");
  for (let i = 0; i < 15; i++) {
    const monthsAgo = randInt(0, 11);
    const createdDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, randInt(1, 28));
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;

    const client = await prisma.client.create({
      data: {
        name,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        phone: `555-${String(randInt(1000, 9999))}`,
        street: `${randInt(100, 9999)} ${pick(["Main", "Oak", "Maple", "Pine", "Cedar"])} St`,
        city: pick(["Springfield", "Riverside", "Franklin", "Greenville", "Bristol"]),
        state: pick(["PA", "NJ", "NY", "MD", "DE"]),
        zip: String(randInt(10000, 99999)),
        howFoundUs: pick(["Google", "Referral", "Walk-in", "Facebook", "Returning customer"]),
        createdAt: createdDate,
        updatedAt: createdDate,
      },
    });
    clientIds.push(client.id);

    const numVehicles = randInt(1, 2);
    for (let v = 0; v < numVehicles; v++) {
      const vp = VEHICLES[(i * 2 + v) % VEHICLES.length];
      const vehicle = await prisma.vehicle.create({
        data: {
          make: vp.make,
          model: vp.model,
          year: vp.year,
          vehicleType: vp.type,
          engine: vp.engine,
          color: pick(["Silver", "White", "Black", "Blue", "Red", "Gray"]),
          licensePlate: `${pick(["ABC", "XYZ", "KLM", "DEF", "GHI"])}${randInt(1000, 9999)}`,
          odometer: randInt(30000, 180000),
          createdAt: createdDate,
          updatedAt: createdDate,
          owners: { create: { clientId: client.id } },
        },
      });
      vehicles.push({ id: vehicle.id, clientId: client.id });
    }
  }
  console.log(`  ${clientIds.length} clients, ${vehicles.length} vehicles`);

  console.log("Creating invoices across 12 months...");
  let nextNum = maxNum + 1;
  let invoiceCount = 0;

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const invoicesThisMonth = randInt(3, 6);

    for (let j = 0; j < invoicesThisMonth; j++) {
      const template = pick(TEMPLATES);
      const clientId = pick(clientIds);
      const clientVehicles = vehicles.filter((v) => v.clientId === clientId);
      const vehicle = clientVehicles.length > 0 ? pick(clientVehicles) : null;
      const issueDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, randInt(1, 28));

      let status: string;
      if (monthsAgo === 0) {
        status = pick(["IN_PROGRESS", "IN_PROGRESS", "COMPLETED", "PAID", "SENT", "ESTIMATE"]);
      } else if (monthsAgo <= 2) {
        status = pick(["PAID", "PAID", "COMPLETED", "PAID", "SENT"]);
      } else {
        status = pick(["PAID", "PAID", "PAID", "PAID", "COMPLETED", "DECLINED"]);
      }

      const jobStartedAt = ["IN_PROGRESS", "COMPLETED", "PAID"].includes(status)
        ? new Date(issueDate.getTime() + 24 * 60 * 60 * 1000)
        : null;
      const completedAt = ["COMPLETED", "PAID"].includes(status)
        ? new Date(issueDate.getTime() + randInt(1, 5) * 24 * 60 * 60 * 1000)
        : null;

      const lines = template.lines.map((l, i) => ({
        kind: l.kind,
        description: l.description,
        category: l.category,
        cost: l.cost,
        price: l.price,
        qty: l.qty,
        unit: l.unit,
        amount: l.price * l.qty,
        taxable: true,
        approved: true,
        sortOrder: i,
      }));

      const subtotal = lines.reduce((s, l) => s + l.amount, 0);
      const taxAmount = subtotal * (TAX_RATE / 100);
      const total = subtotal + taxAmount;

      let amountPaid = 0;
      const payments: { amount: number; method: string; paidAt: Date }[] = [];

      if (status === "PAID") {
        amountPaid = total;
        payments.push({
          amount: total,
          method: pick(METHODS),
          paidAt: new Date(issueDate.getTime() + randInt(1, 10) * 24 * 60 * 60 * 1000),
        });
      } else if (status === "COMPLETED" && Math.random() < 0.5) {
        const partial = Math.round(total * pick([0.3, 0.5, 0.75]) * 100) / 100;
        amountPaid = partial;
        payments.push({
          amount: partial,
          method: pick(METHODS),
          paidAt: new Date(issueDate.getTime() + randInt(1, 10) * 24 * 60 * 60 * 1000),
        });
      }

      const invoiceNumber = `INV-${String(nextNum).padStart(6, "0")}`;
      nextNum++;

      await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          status,
          issueDate,
          jobStartedAt,
          completedAt,
          subtotal,
          taxAmount,
          total,
          amountPaid,
          taxRate: TAX_RATE,
          discount: 0,
          otherCharges: 0,
          notes: pick([null, null, null, "Follow up in 3 months", "Warranty check required"]),
          clientId,
          vehicleId: vehicle?.id ?? null,
          lines: { create: lines },
          payments: payments.length > 0 ? { create: payments } : undefined,
          createdAt: issueDate,
          updatedAt: issueDate,
        },
      });
      invoiceCount++;
    }
    console.log(`  Month ${12 - monthsAgo}/12 — ${invoicesThisMonth} invoices`);
  }

  console.log("");
  console.log(`Done! Created:`);
  console.log(`  ${clientIds.length} clients`);
  console.log(`  ${vehicles.length} vehicles`);
  console.log(`  ${invoiceCount} invoices`);
  console.log("");
  console.log("Refresh the dashboard to see the data.");
}

main().finally(() => prisma.$disconnect());