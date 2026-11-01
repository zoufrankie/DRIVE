import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

type Row = {
  invoiceNumber: string;
  created: string;
  clientName: string;
  type: string;
  status: string;
  paymentType: string;
  tax: number;
  subtotal: number;
  discountValue: number;
  otherValueCost: number;
  total: number;
  paidAmount: number;
  paidDate: string;
  totalProfit: number;
  vehicle: string;
  vin: string;
};

const HEADERS = [
  "Inv No.",
  "Created",
  "Client Name",
  "Type",
  "Status",
  "Payment Type",
  "Tax",
  "Sub Total",
  "Discount Value",
  "Other Value Cost",
  "Total",
  "Paid Amount",
  "Paid Date",
  "Tot Profit",
  "Vehicle",
  "VIN",
];

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";
  const format = searchParams.get("format") ?? "json";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
  }

  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T23:59:59");

  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: fromDate, lte: toDate } },
    orderBy: { paidAt: "asc" },
    include: {
      invoice: {
        include: {
          client: { select: { name: true } },
          vehicle: {
            select: {
              year: true, make: true, model: true, vin: true,
            },
          },
          lines: {
            where: { approved: true },
            select: { category: true, cost: true, qty: true },
          },
        },
      },
    },
  });

  const rows: Row[] = payments.map((p) => {
    const inv = p.invoice;
    const ratio = inv.total > 0.01 ? Math.min(p.amount / inv.total, 1) : 1;

    const categories = Array.from(
      new Set(inv.lines.map((l) => l.category).filter((c): c is string => !!c))
    );

    const costTotal = inv.lines.reduce((s, l) => s + l.cost * l.qty, 0);
    const invoiceProfit = inv.subtotal - inv.discount + inv.otherCharges - costTotal;

    const vehicle = inv.vehicle
      ? [inv.vehicle.year, inv.vehicle.make, inv.vehicle.model].filter(Boolean).join(" ")
      : "";

    return {
      invoiceNumber: inv.number,
      created: ymd(new Date(inv.issueDate)),
      clientName: inv.client.name,
      type: categories.join(" / "),
      status: inv.status,
      paymentType: p.method,
      tax: Math.round(inv.taxAmount * ratio * 100) / 100,
      subtotal: Math.round(inv.subtotal * ratio * 100) / 100,
      discountValue: Math.round(inv.discount * ratio * 100) / 100,
      otherValueCost: Math.round(inv.otherCharges * ratio * 100) / 100,
      total: Math.round(inv.total * ratio * 100) / 100,
      paidAmount: Math.round(p.amount * 100) / 100,
      paidDate: ymd(new Date(p.paidAt)),
      totalProfit: Math.round(invoiceProfit * ratio * 100) / 100,
      vehicle,
      vin: inv.vehicle?.vin ?? "",
    };
  });

  const totals = {
    count: rows.length,
    tax: Math.round(rows.reduce((s, r) => s + r.tax, 0) * 100) / 100,
    subtotal: Math.round(rows.reduce((s, r) => s + r.subtotal, 0) * 100) / 100,
    discountValue: Math.round(rows.reduce((s, r) => s + r.discountValue, 0) * 100) / 100,
    otherValueCost: Math.round(rows.reduce((s, r) => s + r.otherValueCost, 0) * 100) / 100,
    total: Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100,
    paidAmount: Math.round(rows.reduce((s, r) => s + r.paidAmount, 0) * 100) / 100,
    totalProfit: Math.round(rows.reduce((s, r) => s + r.totalProfit, 0) * 100) / 100,
  };

  if (format === "csv") {
    const lines: string[] = [];
    lines.push(HEADERS.map(csvEscape).join(","));

    for (const r of rows) {
      lines.push(
        [
          r.invoiceNumber,
          r.created,
          r.clientName,
          r.type,
          r.status,
          r.paymentType,
          r.tax.toFixed(2),
          r.subtotal.toFixed(2),
          r.discountValue.toFixed(2),
          r.otherValueCost.toFixed(2),
          r.total.toFixed(2),
          r.paidAmount.toFixed(2),
          r.paidDate,
          r.totalProfit.toFixed(2),
          r.vehicle,
          r.vin,
        ].map(csvEscape).join(",")
      );
    }

    lines.push("");
    lines.push(
      [
        "TOTALS",
        "",
        "",
        "",
        "",
        "",
        totals.tax.toFixed(2),
        totals.subtotal.toFixed(2),
        totals.discountValue.toFixed(2),
        totals.otherValueCost.toFixed(2),
        totals.total.toFixed(2),
        totals.paidAmount.toFixed(2),
        "",
        totals.totalProfit.toFixed(2),
        "",
        "",
      ].map(csvEscape).join(",")
    );

    const csv = "\uFEFF" + lines.join("\r\n");
    const filename = `accounting-${from}-to-${to}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ rows, totals, from, to });
}