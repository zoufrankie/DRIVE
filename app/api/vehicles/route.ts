import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const clientId = searchParams.get("clientId")?.trim() ?? "";

  try {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        ...(clientId ? { owners: { some: { clientId } } } : {}),
        ...(q
          ? {
              OR: [
                { make: { contains: q } },
                { model: { contains: q } },
                { vin: { contains: q } },
                { licensePlate: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        owners: { include: { client: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json(vehicles);
  } catch (e) {
    console.error("GET /api/vehicles failed:", e);
    return NextResponse.json(
      { error: "Server error", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.make?.trim() || !body.model?.trim()) {
    return NextResponse.json({ error: "Make and model are required" }, { status: 400 });
  }
  const clientIds: string[] = Array.isArray(body.clientIds) ? body.clientIds : [];
  if (clientIds.length === 0) {
    return NextResponse.json({ error: "At least one owner is required" }, { status: 400 });
  }

  // VIN duplicate check
  const vin = body.vin?.trim() || null;
  if (vin) {
    const existing = await prisma.vehicle.findFirst({ where: { vin } });
    if (existing) {
      return NextResponse.json(
        {
          error: `A vehicle with VIN ${vin} is already in the system (${[
            existing.year,
            existing.make,
            existing.model,
          ]
            .filter(Boolean)
            .join(" ")}).`,
        },
        { status: 409 }
      );
    }
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        vin,
        licensePlate: body.licensePlate?.trim() || null,
        vehicleType: body.vehicleType?.trim() || null,
        year: body.year ? Number(body.year) : null,
        make: body.make.trim(),
        model: body.model.trim(),
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
      include: { owners: true },
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (e) {
    console.error("POST /api/vehicles failed:", e);
    return NextResponse.json(
      { error: "Could not save vehicle: " + String(e) },
      { status: 500 }
    );
  }
}