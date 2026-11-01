import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const odometer = body.odometer != null ? Number(body.odometer) : null;
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { odometer: odometer != null && !isNaN(odometer) ? odometer : null },
  });
  return NextResponse.json(vehicle);
}