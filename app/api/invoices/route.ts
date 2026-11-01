import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const jobcardsOnly = searchParams.get("jobcards") === "true";

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(jobcardsOnly ? { jobStartedAt: { not: null } } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q } },
              { client: { name: { contains: q } } },
              { vehicle: { vin: { contains: q } } },
              { vehicle: { licensePlate: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      vehicle: {
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          licensePlate: true,
        },
      },
    },
  });
  return NextResponse.json(invoices);
}

async function nextInvoiceNumber() {
  const all = await prisma.invoice.findMany({ select: { number: true } });
  let max = 0;
  for (const inv of all) {
    const m = inv.number.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `INV-${String(max + 1).padStart(6, "0")}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.clientId) {
    return NextResponse.json({ error: "Client is required" }, { status: 400 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", defaultTaxRate: 10, defaultLaborRate: 100 },
  });

  const number = await nextInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      number,
      status: "ESTIMATE",
      notes: body.notes?.trim() || null,
      taxRate: Number(body.taxRate) || settings.defaultTaxRate,
      discount: Number(body.discount) || 0,
      otherCharges: Number(body.otherCharges) || 0,
      clientId: body.clientId,
      vehicleId: body.vehicleId || null,
    },
    include: { client: true, vehicle: true },
  });
  return NextResponse.json(invoice, { status: 201 });
}