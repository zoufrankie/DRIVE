import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      owners: { include: { client: true } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const clientIds: string[] = Array.isArray(body.clientIds) ? body.clientIds : [];

  // Replace owners: delete existing, recreate
  await prisma.vehicleOwner.deleteMany({ where: { vehicleId: id } });

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      vin: body.vin?.trim() || null,
      licensePlate: body.licensePlate?.trim() || null,
      vehicleType: body.vehicleType?.trim() || null,
      year: body.year ? Number(body.year) : null,
      make: body.make?.trim(),
      model: body.model?.trim(),
      trim: body.trim?.trim() || null,
      transmission: body.transmission?.trim() || null,
      drivenWheels: body.drivenWheels?.trim() || null,
      engine: body.engine?.trim() || null,
      odometer: body.odometer ? Number(body.odometer) : null,
      color: body.color?.trim() || null,
      notes: body.notes?.trim() || null,
      owners: {
        create: clientIds.map((cid) => ({ clientId: cid })),
      },
    },
  });

  return NextResponse.json(vehicle);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.vehicle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
