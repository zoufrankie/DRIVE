import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const twelveMonthsAgo = addMonths(thisMonthStart, -11);

  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        client: { select: { id: true, name: true, createdAt: true } },
        lines: {
          where: { approved: true },
          select: { category: true, amount: true },
        },
        payments: { select: { amount: true, paidAt: true } },
      },
    }),
    prisma.client.findMany({ select: { id: true, createdAt: true } }),
  ]);

  const monthly: Array<{
    key: string;
    label: string;
    revenue: number;
    payments: number;
    invoicesCount: number;
    newClients: number;
    existingClients: number;
  }> = [];

  for (let i = 0; i < 12; i++) {
    const monthStart = addMonths(twelveMonthsAgo, i);
    const monthEnd = endOfMonth(monthStart);

    const monthInvoices = invoices.filter((inv) => {
      const d = new Date(inv.issueDate);
      return d >= monthStart && d <= monthEnd;
    });

    const revenue = monthInvoices
      .filter((inv) => inv.status !== "DECLINED" && inv.status !== "CANCELLED")
      .reduce((s, inv) => s + inv.total, 0);
    const invoicesCount = monthInvoices.length;

    let paymentsSum = 0;
    for (const inv of invoices) {
      for (const p of inv.payments) {
        const d = new Date(p.paidAt);
        if (d >= monthStart && d <= monthEnd) paymentsSum += p.amount;
      }
    }

    const newClients = clients.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= monthStart && d <= monthEnd;
    }).length;

    const existingClientIds = new Set<string>();
    for (const inv of monthInvoices) {
      if (new Date(inv.client.createdAt) < monthStart) {
        existingClientIds.add(inv.client.id);
      }
    }

    monthly.push({
      key: ymd(monthStart),
      label: monthLabel(monthStart),
      revenue,
      payments: paymentsSum,
      invoicesCount,
      newClients,
      existingClients: existingClientIds.size,
    });
  }

  const categoryMap = new Map<string, { revenue: number; jobIds: Set<string> }>();
  for (const inv of invoices) {
    if (new Date(inv.issueDate) < twelveMonthsAgo) continue;
    if (inv.status === "DECLINED" || inv.status === "CANCELLED") continue;
    for (const line of inv.lines) {
      const cat = line.category ?? "UNCATEGORIZED";
      let entry = categoryMap.get(cat);
      if (!entry) {
        entry = { revenue: 0, jobIds: new Set() };
        categoryMap.set(cat, entry);
      }
      entry.revenue += line.amount;
      entry.jobIds.add(inv.id);
    }
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, { revenue, jobIds }]) => ({
      category,
      revenue,
      jobCount: jobIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const thisMonthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.issueDate);
    return d >= thisMonthStart && d <= thisMonthEnd;
  });

  const revenueThisMonth = thisMonthInvoices
    .filter((inv) => inv.status !== "DECLINED" && inv.status !== "CANCELLED")
    .reduce((s, inv) => s + inv.total, 0);

  const invoicesThisMonth = thisMonthInvoices.length;

  let paymentsThisMonth = 0;
  for (const inv of invoices) {
    for (const p of inv.payments) {
      const d = new Date(p.paidAt);
      if (d >= thisMonthStart && d <= thisMonthEnd) paymentsThisMonth += p.amount;
    }
  }

  const outstandingInvoices = invoices.filter((inv) => {
    if (inv.status === "DECLINED" || inv.status === "CANCELLED") return false;
    return inv.total - inv.amountPaid > 0.01;
  });
  const outstandingBalance = outstandingInvoices.reduce(
    (s, inv) => s + Math.max(0, inv.total - inv.amountPaid),
    0
  );

  const jobsInProgress = invoices.filter((inv) => inv.status === "IN_PROGRESS");
  const jobsInProgressCount = jobsInProgress.length;
  const jobsInProgressTotal = jobsInProgress.reduce((s, inv) => s + inv.total, 0);

  const newClientsThisMonth = clients.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= thisMonthStart && d <= thisMonthEnd;
  }).length;

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const overdue = invoices
    .filter((inv) => {
      if (inv.status === "PAID" || inv.status === "DECLINED" || inv.status === "CANCELLED") {
        return false;
      }
      const balance = inv.total - inv.amountPaid;
      if (balance <= 0.01) return false;
      return new Date(inv.issueDate) < fourteenDaysAgo;
    })
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      clientName: inv.client.name,
      total: inv.total,
      balance: inv.total - inv.amountPaid,
      daysOld: Math.floor((now.getTime() - new Date(inv.issueDate).getTime()) / (24 * 60 * 60 * 1000)),
    }))
    .sort((a, b) => b.daysOld - a.daysOld)
    .slice(0, 10);

  return NextResponse.json({
    kpis: {
      revenueThisMonth,
      paymentsThisMonth,
      outstandingBalance,
      outstandingCount: outstandingInvoices.length,
      jobsInProgressCount,
      jobsInProgressTotal,
      newClientsThisMonth,
      invoicesThisMonth,
    },
    monthly,
    byCategory,
    overdue,
  });
}