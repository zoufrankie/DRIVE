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

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
    data.title = title;
  }
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.startMinute !== undefined) data.startMinute = Number(body.startMinute);
  if (body.endMinute !== undefined) data.endMinute = Number(body.endMinute);
  if (body.date !== undefined) data.date = String(body.date);

  const appointment = await prisma.appointment.update({ where: { id }, data });
  return NextResponse.json(appointment);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}