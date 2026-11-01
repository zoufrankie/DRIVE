import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function recalcInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!invoice) return;
  const subtotal = invoice.lines.reduce((sum, l) => sum + l.amount, 0);
  const taxableSubtotal = invoice.lines
    .filter((l) => l.taxable)
    .reduce((sum, l) => sum + l.amount, 0);
  const taxableBase = taxableSubtotal - invoice.discount;
  const taxAmount = taxableBase * (invoice.taxRate / 100);
  const total = subtotal + invoice.otherCharges - invoice.discount + taxAmount;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, taxAmount, total },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const lines = await prisma.invoiceLine.findMany({
    where: { invoiceId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(lines);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const qty = Number(body.qty) || 0;
  const price = Number(body.price) || 0;
  const line = await prisma.invoiceLine.create({
    data: {
      invoiceId: id,
      kind: body.kind === "LABOR" ? "LABOR" : "PART",
      description: body.description?.trim() || "New item",
      cost: Number(body.cost) || 0,
      price,
      qty,
      unit: body.unit?.trim() || null,
      taxable: body.taxable !== false,
      approved: body.approved !== false,
      amount: qty * price,
      group: body.group?.trim() || null,
      sortOrder: Number(body.sortOrder) || 0,
    },
  });
  await recalcInvoice(id);
  return NextResponse.json(line, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { lineId, invoiceId, ...updates } = body;
  if (!lineId || !invoiceId) {
    return NextResponse.json({ error: "lineId and invoiceId required" }, { status: 400 });
  }
  const qty = Number(updates.qty) || 0;
  const price = Number(updates.price) || 0;
  await prisma.invoiceLine.update({
    where: { id: lineId },
    data: {
      kind: updates.kind,
      description: updates.description?.trim() || "Item",
      cost: Number(updates.cost) || 0,
      price,
      qty,
      unit: updates.unit?.trim() || null,
      taxable: updates.taxable !== false,
      approved: updates.approved !== false,
      amount: qty * price,
      group: updates.group?.trim() || null,
    },
  });
  await recalcInvoice(invoiceId);
  return NextResponse.json({ ok: true });
}

// Bulk update.
// - { invoiceId, kind, approved }                    -> all lines of that kind
// - { invoiceId, group, approved }                   -> all lines with that group (any kind)
// - { invoiceId, kind, group, approved }             -> narrowed to that kind + group
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { invoiceId, kind, group, approved } = body;
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }
  if (!kind && group === undefined) {
    return NextResponse.json(
      { error: "kind or group required" },
      { status: 400 }
    );
  }
  const where: { invoiceId: string; kind?: string; group?: string | null } = {
    invoiceId,
  };
  if (kind) where.kind = kind;
  if (group !== undefined) where.group = group === "" ? null : group;
  await prisma.invoiceLine.updateMany({
    where,
    data: { approved: approved !== false },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const lineId = searchParams.get("lineId");
  const invoiceId = searchParams.get("invoiceId");
  if (!lineId || !invoiceId) {
    return NextResponse.json({ error: "lineId and invoiceId required" }, { status: 400 });
  }
  await prisma.invoiceLine.delete({ where: { id: lineId } });
  await recalcInvoice(invoiceId);
  return NextResponse.json({ ok: true });
}