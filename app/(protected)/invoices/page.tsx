"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Invoice = {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: string;
  client: { id: string; name: string };
  vehicle: { year: number | null; make: string; model: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/invoices?q=${encodeURIComponent(q)}&status=${status}`
        );
        if (!res.ok) {
          const text = await res.text();
          setError(`API error ${res.status}: ${text.slice(0, 300)}`);
          setInvoices([]);
          setLoading(false);
          return;
        }
        setInvoices(await res.json());
      } catch (e) {
        setError(String(e));
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, status]);

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-black">Invoices</h1>
        <Link
          href="/invoices/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
        >
          + New Invoice
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by number, client, VIN, or plate..."
          className="flex-1 border border-gray-400 bg-white text-black placeholder:text-gray-600 p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-400 bg-white text-black p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm mb-4 whitespace-pre-wrap font-mono">
          {error}
        </div>
      )}

      {loading && invoices.length === 0 ? (
        <p className="text-gray-700 text-sm">Loading…</p>
      ) : invoices.length === 0 && !error ? (
        <p className="text-gray-700 text-sm">
          {q || status ? "No invoices match those filters." : "No invoices yet."}
        </p>
      ) : (
        <div className="bg-white rounded shadow-sm border border-gray-300 overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-100 border-b border-gray-300 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Number</div>
            <div>Client</div>
            <div>Vehicle</div>
            <div>Date</div>
            <div>Status</div>
            <div className="text-right">Total</div>
          </div>
          {invoices.map((i) => (
            <Link
              key={i.id}
              href={`/invoices/${i.id}`}
              className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 text-sm items-center"
            >
              <div className="font-mono text-black font-semibold">{i.number}</div>
              <div className="text-black truncate">{i.client.name}</div>
              <div className="text-black truncate">
                {i.vehicle
                  ? [i.vehicle.year, i.vehicle.make, i.vehicle.model]
                      .filter(Boolean)
                      .join(" ")
                  : "—"}
              </div>
              <div className="text-black">
                {new Date(i.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                    STATUS_COLORS[i.status] ?? "bg-gray-200 text-gray-800"
                  }`}
                >
                  {i.status}
                </span>
              </div>
              <div className="text-black text-right font-mono">
                ${i.total.toFixed(2)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}