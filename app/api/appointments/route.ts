import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date")?.trim() ?? "";
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";

  let where: any = {};
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    where.date = date;
  } else if (from && to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
    }
    where.date = { gte: from, lte: to };
  } else {
    return NextResponse.json({ error: "Provide ?date= or ?from=&to=" }, { status: 400 });
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: [{ date: "asc" }, { startMinute: "asc" }],
  });
  return NextResponse.json(appointments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = String(body.date ?? "").trim();
  const startMinute = Number(body.startMinute);
  const endMinute = Number(body.endMinute);
  const title = String(body.title ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute) || startMinute < 0 || endMinute > 1440) {
    return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
  }
  if (endMinute <= startMinute) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      date,
      startMinute,
      endMinute,
      title,
      description: body.description?.trim() || null,
    },
  });
  return NextResponse.json(appointment, { status: 201 });
}