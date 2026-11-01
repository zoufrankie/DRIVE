"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type Totals = {
  count: number;
  tax: number;
  subtotal: number;
  discountValue: number;
  otherValueCost: number;
  total: number;
  paidAmount: number;
  totalProfit: number;
};

type Preset = "today" | "week" | "month" | "lastMonth" | "year" | "custom";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  if (preset === "today") {
    return { from: ymd(now), to: ymd(now) };
  }
  if (preset === "week") {
    const d = new Date(now);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return { from: ymd(d), to: ymd(now) };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: ymd(start), to: ymd(now) };
  }
  if (preset === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: ymd(start), to: ymd(end) };
  }
  if (preset === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { from: ymd(start), to: ymd(now) };
  }
  return { from: ymd(now), to: ymd(now) };
}

function money(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PREVIEW_LIMIT = 100;

export default function AccountingPage() {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(getRange("month").from);
  const [to, setTo] = useState(getRange("month").to);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/accounting?from=${from}&to=${to}&format=json`);
      if (!res.ok) {
        setError(`API error ${res.status}`);
        setRows([]);
        setTotals(null);
        return;
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotals(data.totals ?? null);
    } catch (e) {
      setError(String(e));
      setRows([]);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const range = getRange(p);
      setFrom(range.from);
      setTo(range.to);
    }
  }

  const previewRows = useMemo(() => rows.slice(0, PREVIEW_LIMIT), [rows]);

  const downloadUrl = `/api/accounting?from=${from}&to=${to}&format=csv`;
  const canDownload = rows.length > 0 && !loading;

  return (
    <div className="p-8 w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Accounting</h1>
        <p className="text-gray-700 mt-1">
          Tax-ready export of payment records for a selected date range
        </p>
      </div>

      {/* Presets */}
      <div className="bg-white border border-gray-300 rounded p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month", "lastMonth", "year", "custom"] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                preset === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              {p === "today" && "Today"}
              {p === "week" && "This Week"}
              {p === "month" && "This Month"}
              {p === "lastMonth" && "Last Month"}
              {p === "year" && "This Year"}
              {p === "custom" && "Custom Range"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="w-full border border-gray-400 bg-white text-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="w-full border border-gray-400 bg-white text-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            {canDownload ? (
              <a
                href={downloadUrl}
                className="inline-block w-full text-center bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
              >
                Download CSV ({rows.length} row{rows.length === 1 ? "" : "s"})
              </a>
            ) : (
              <button
                disabled
                className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded text-sm font-medium cursor-not-allowed"
              >
                Download CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Totals */}
      {totals && totals.count > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Payments" value={String(totals.count)} />
          <StatCard label="Paid Amount" value={money(totals.paidAmount)} accent="green" />
          <StatCard label="Tax Collected" value={money(totals.tax)} accent="blue" />
          <StatCard label="Subtotal" value={money(totals.subtotal)} />
          <StatCard label="Discounts" value={money(totals.discountValue)} accent="orange" />
          <StatCard label="Other Charges" value={money(totals.otherValueCost)} />
          <StatCard label="Total Profit" value={money(totals.totalProfit)} accent="purple" />
        </div>
      )}

      {/* Preview */}
      <div className="bg-white border border-gray-300 rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-300 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-black">Preview</h2>
            <p className="text-xs text-gray-600">
              {loading
                ? "Loading…"
                : rows.length === 0
                ? "No payments in selected range"
                : `Showing ${Math.min(rows.length, PREVIEW_LIMIT)} of ${rows.length} row${rows.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {rows.length > PREVIEW_LIMIT && (
            <div className="text-xs text-gray-600">
              CSV includes all {rows.length} rows
            </div>
          )}
        </div>

        {rows.length === 0 && !loading ? (
          <p className="p-8 text-gray-600 text-sm text-center">
            No payments recorded between {from} and {to}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-left text-gray-700 uppercase tracking-wide font-semibold">
                  <th className="px-3 py-2 whitespace-nowrap">Inv No.</th>
                  <th className="px-3 py-2 whitespace-nowrap">Created</th>
                  <th className="px-3 py-2">Client Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payment Type</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                  <th className="px-3 py-2 text-right">Sub Total</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                  <th className="px-3 py-2 text-right">Other</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Paid Amount</th>
                  <th className="px-3 py-2 whitespace-nowrap">Paid Date</th>
                  <th className="px-3 py-2 text-right">Profit</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2 whitespace-nowrap">VIN</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr
                    key={`${r.invoiceNumber}-${i}`}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-1.5 font-mono text-blue-700 font-semibold whitespace-nowrap">
                      {r.invoiceNumber}
                    </td>
                    <td className="px-3 py-1.5 text-black whitespace-nowrap">{r.created}</td>
                    <td className="px-3 py-1.5 text-black truncate max-w-[160px]">
                      {r.clientName}
                    </td>
                    <td className="px-3 py-1.5 text-black truncate max-w-[140px]" title={r.type}>
                      {r.type || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-black text-[10px]">{r.status}</td>
                    <td className="px-3 py-1.5 text-black text-[10px]">{r.paymentType}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-black">
                      {r.tax.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-black">
                      {r.subtotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-black">
                      {r.discountValue.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-black">
                      {r.otherValueCost.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-black">
                      {r.total.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-green-700 font-semibold">
                      {r.paidAmount.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-black whitespace-nowrap">{r.paidDate}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-purple-700">
                      {r.totalProfit.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-black truncate max-w-[120px]">
                      {r.vehicle || "—"}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-gray-700 whitespace-nowrap">
                      {r.vin || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded text-sm">
        <p className="font-semibold mb-1">About this export</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Each row represents one payment received in the date range — filter is by{" "}
            <strong>payment date</strong>, not invoice date.
          </li>
          <li>
            If an invoice was paid in multiple partial payments, each payment gets its own
            row with prorated tax, subtotal, discount, and profit.
          </li>
          <li>
            The CSV includes a <strong>TOTALS</strong> row at the bottom that sums every
            column.
          </li>
          <li>Opens directly in Excel, Google Sheets, or Numbers.</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "gray",
}: {
  label: string;
  value: string;
  accent?: "gray" | "blue" | "green" | "purple" | "orange";
}) {
  const accents: Record<typeof accent, string> = {
    gray: "border-l-gray-500",
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    purple: "border-l-purple-500",
    orange: "border-l-orange-500",
  };
  return (
    <div className={`bg-white border border-gray-300 border-l-4 rounded p-3 ${accents[accent]}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="text-lg font-bold text-black mt-0.5 truncate">{value}</div>
    </div>
  );
}