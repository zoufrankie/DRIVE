import { prisma } from "./prisma";

export async function recalcInvoicePayments(invoiceId: string) {
  const agg = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const amountPaid = agg._sum.amount ?? 0;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return null;

  let status = invoice.status;
  if (amountPaid >= invoice.total - 0.01) {
    status = "PAID";
  } else if (invoice.status === "PAID") {
    status = invoice.completedAt ? "COMPLETED" : "IN_PROGRESS";
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid, status },
    include: {
      payments: { orderBy: { paidAt: "desc" } },
      client: true,
      vehicle: true,
      lines: true,
    },
  });
}