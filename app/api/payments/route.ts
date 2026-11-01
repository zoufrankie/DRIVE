import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";
  const method = searchParams.get("method")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";

  const where: any = {};

  if (from || to) {
    where.paidAt = {};
    if (from) where.paidAt.gte = new Date(from + "T00:00:00");
    if (to) where.paidAt.lte = new Date(to + "T23:59:59");
  }

  if (method) where.method = method;

  if (category) {
    where.invoice = { lines: { some: { category } } };
  }

  if (q) {
    where.OR = [
      { invoice: { number: { contains: q } } },
      { invoice: { client: { name: { contains: q } } } },
      { invoice: { vehicle: { vin: { contains: q } } } },
      { invoice: { vehicle: { licensePlate: { contains: q } } } },
    ];
  }

  const raw = await prisma.payment.findMany({
    where,
    include: {
      invoice: {
        include: {
          client: { select: { id: true, name: true } },
          vehicle: {
            select: {
              id: true, year: true, make: true, model: true, licensePlate: true,
            },
          },
          lines: { select: { category: true, kind: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const payments = raw.map((p) => {
    const laborCats = Array.from(
      new Set(
        p.invoice.lines
          .filter((l) => l.kind === "LABOR" && l.category)
          .map((l) => l.category as string)
      )
    );
    const partCats = Array.from(
      new Set(
        p.invoice.lines
          .filter((l) => l.kind === "PART" && l.category)
          .map((l) => l.category as string)
      )
    );
    const cats = laborCats.length > 0 ? laborCats : partCats;
    return {
      id: p.id,
      amount: p.amount,
      method: p.method,
      notes: p.notes,
      paidAt: p.paidAt,
      invoice: {
        id: p.invoice.id,
        number: p.invoice.number,
        total: p.invoice.total,
        client: p.invoice.client,
        vehicle: p.invoice.vehicle,
        categories: cats,
        categorySource: laborCats.length > 0 ? "LABOR" : partCats.length > 0 ? "PARTS" : "NONE",
      },
    };
  });

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return NextResponse.json({ payments, total });
}