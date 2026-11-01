import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getOrCreate() {
  return prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", defaultTaxRate: 10, defaultLaborRate: 100 },
  });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getOrCreate();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {
      shopName: body.shopName?.trim() || null,
      defaultTaxRate: Number(body.defaultTaxRate) || 0,
      defaultLaborRate: Number(body.defaultLaborRate) || 0,
    },
    create: {
      id: "singleton",
      shopName: body.shopName?.trim() || null,
      defaultTaxRate: Number(body.defaultTaxRate) || 0,
      defaultLaborRate: Number(body.defaultLaborRate) || 0,
    },
  });
  return NextResponse.json(settings);
}