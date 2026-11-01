import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalcInvoicePayments } from "@/lib/payments";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const payments = await prisma.payment.findMany({
    where: { invoiceId: id },
    orderBy: { paidAt: "desc" },
  });
  return NextResponse.json(payments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const amount = Number(body.amount) || 0;

  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const payment = await prisma.payment.create({
    data: {
      invoiceId: id,
      amount,
      method: body.method?.trim() || "CASH",
      notes: body.notes?.trim() || null,
    },
  });

  const updated = await recalcInvoicePayments(id);
  return NextResponse.json({ payment, invoice: updated });
}