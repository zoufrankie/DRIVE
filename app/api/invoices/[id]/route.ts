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
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: true,
      lines: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.warranty !== undefined) data.warranty = body.warranty?.trim() || null;
  if (body.discount !== undefined) data.discount = Number(body.discount) || 0;
  if (body.otherCharges !== undefined) data.otherCharges = Number(body.otherCharges) || 0;
  if (body.taxRate !== undefined) data.taxRate = Number(body.taxRate) || 0;
  if (body.issueDate !== undefined) data.issueDate = new Date(body.issueDate);
  if (body.clientId !== undefined) data.clientId = body.clientId;
  if (body.vehicleId !== undefined) data.vehicleId = body.vehicleId || null;
  if (body.jobStartedAt !== undefined)
    data.jobStartedAt = body.jobStartedAt ? new Date(body.jobStartedAt) : null;
  if (body.completedAt !== undefined)
    data.completedAt = body.completedAt ? new Date(body.completedAt) : null;

  await prisma.invoice.update({ where: { id }, data });

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (invoice) {
    const approved = invoice.lines.filter((l) => l.approved);
    const subtotal = approved.reduce((s, l) => s + l.amount, 0);
    const taxableSubtotal = approved
      .filter((l) => l.taxable)
      .reduce((s, l) => s + l.amount, 0);
    const taxableBase = taxableSubtotal - invoice.discount;
    const taxAmount = taxableBase * (invoice.taxRate / 100);
    const total = subtotal + invoice.otherCharges - invoice.discount + taxAmount;
    await prisma.invoice.update({
      where: { id },
      data: { subtotal, taxAmount, total },
    });
  }

  const finalInvoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: true,
      lines: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  return NextResponse.json(finalInvoice);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}