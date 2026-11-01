import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalcInvoicePayments } from "@/lib/payments";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const amount = body.amount !== undefined ? Number(body.amount) : existing.amount;
  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const data: Record<string, unknown> = { amount };
  if (body.method !== undefined) data.method = body.method?.trim() || "CASH";
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.paidAt !== undefined) data.paidAt = new Date(body.paidAt);

  const payment = await prisma.payment.update({ where: { id }, data });
  const invoice = await recalcInvoicePayments(existing.invoiceId);

  return NextResponse.json({ payment, invoice });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.payment.delete({ where: { id } });
  const invoice = await recalcInvoicePayments(existing.invoiceId);

  return NextResponse.json({ ok: true, invoice });
}