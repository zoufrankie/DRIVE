"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";

type Payment = {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paidAt: string;
  invoice: {
    id: string;
    number: string;
    total: number;
    client: { id: string; name: string };
    vehicle:
      | { id: string; year: number | null; make: string; model: string; licensePlate: string | null }
      | null;
    categories: string[];
    categorySource: "LABOR" | "PARTS" | "NONE";
  };
};

const PAYMENT_METHODS = ["CASH", "CARD", "CHECK", "TRANSFER"];
const WORK_CATEGORIES = [
  "BRAKES", "COOLING", "ELECTRICAL", "ENGINE", "EXHAUST", "HVAC",
  "INSPECTION", "OIL", "SUSPENSION", "TIRES", "TRANSMISSION",
];

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-green-100 text-green-800",
  CARD: "bg-blue-100 text-blue-800",
  CHECK: "bg-purple-100 text-purple-800",
  TRANSFER: "bg-amber-100 text-amber-800",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (method) params.set("method", method);
        if (category) params.set("category", category);
        const res = await fetch(`/api/payments?${params.toString()}`);
        if (!res.ok) {
          setError(`API error ${res.status}`);
          setPayments([]);
          setTotal(0);
          return;
        }
        const data = await res.json();
        setPayments(data.payments ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        setError(String(e));
        setPayments([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, from, to, method, category, refreshKey]);

  const hasFilters = q || from || to || method || category;

  function clearFilters() {
    setQ("");
    setFrom("");
    setTo("");
    setMethod("");
    setCategory("");
  }

  async function saveEdit(updated: { amount: number; method: string; notes: string; paidAt: string }) {
    if (!editing) return;
    const res = await fetch(`/api/payments/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      setEditing(null);
      setRefreshKey((k) => k + 1);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/payments/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleting(null);
      setRefreshKey((k) => k + 1);
    }
  }

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Payments</h1>
          <p className="text-gray-700 mt-1">
            {payments.length} payment{payments.length === 1 ? "" : "s"}
            {hasFilters && " (filtered)"}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Invoice #, client, VIN, plate…"
              className="w-full border border-gray-400 bg-white text-black placeholder:text-gray-500 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-400 bg-white text-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-400 bg-white text-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment type</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-gray-400 bg-white text-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All types</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type of work</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-400 bg-white text-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All work types</option>
              {WORK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {loading && payments.length === 0 ? (
        <p className="text-gray-700 text-sm">Loading…</p>
      ) : payments.length === 0 && !error ? (
        <p className="text-gray-700 text-sm">
          {hasFilters ? "No payments match those filters." : "No payments recorded yet."}
        </p>
      ) : (
        <div className="bg-white rounded shadow-sm border border-gray-300 overflow-hidden">
          <div className="grid grid-cols-[1fr_1.1fr_1.3fr_0.9fr_0.9fr_1.6fr_0.9fr_1fr] gap-3 px-4 py-3 bg-gray-100 border-b border-gray-300 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Invoice</div>
            <div>Client</div>
            <div>Vehicle</div>
            <div>Date</div>
            <div>Method</div>
            <div>Services</div>
            <div className="text-right">Amount</div>
            <div className="text-center">Actions</div>
          </div>
          {payments.map((p) => {
            const vehicleText = p.invoice.vehicle
              ? [p.invoice.vehicle.year, p.invoice.vehicle.make, p.invoice.vehicle.model]
                  .filter(Boolean)
                  .join(" ")
              : "—";
            return (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_1.1fr_1.3fr_0.9fr_0.9fr_1.6fr_0.9fr_1fr] gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 text-sm items-center hover:bg-gray-50"
              >
                <Link
                  href={`/invoices/${p.invoice.id}`}
                  className="font-mono text-blue-700 hover:underline font-semibold"
                >
                  {p.invoice.number}
                </Link>
                <div className="text-black truncate">{p.invoice.client.name}</div>
                <div className="text-black truncate">
                  {vehicleText}
                  {p.invoice.vehicle?.licensePlate && (
                    <span className="text-gray-500 text-xs ml-1">
                      · {p.invoice.vehicle.licensePlate}
                    </span>
                  )}
                </div>
                <div className="text-black text-xs">
                  {new Date(p.paidAt).toLocaleDateString()}
                </div>
                <div>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                      METHOD_COLORS[p.method] ?? "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {p.method}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 items-center">
                  {p.invoice.categories.length === 0 ? (
                    <span className="text-gray-500 text-xs">—</span>
                  ) : (
                    <>
                      {p.invoice.categories.map((c) => (
                        <span
                          key={c}
                          className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            p.invoice.categorySource === "LABOR"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                          title={
                            p.invoice.categorySource === "LABOR"
                              ? "From labor lines"
                              : "From parts lines (no labor categories)"
                          }
                        >
                          {c}
                        </span>
                      ))}
                    </>
                  )}
                </div>
                <div className="text-black font-mono text-right font-semibold">
                  ${p.amount.toFixed(2)}
                </div>
                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => setEditing(p)}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={() => setDeleting(p)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-[1fr_1.1fr_1.3fr_0.9fr_0.9fr_1.6fr_0.9fr_1fr] gap-3 px-4 py-3 bg-gray-50 border-t-2 border-gray-400 text-sm items-center">
            <div className="col-span-6 text-right font-semibold text-black">
              Total{hasFilters ? " (filtered)" : ""}
            </div>
            <div className="text-right font-mono font-bold text-lg text-black">
              ${total.toFixed(2)}
            </div>
            <div />
          </div>
        </div>
      )}

      <PaymentEditModal
        payment={editing}
        onClose={() => setEditing(null)}
        onSubmit={saveEdit}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete payment"
        actions={
          <>
            <button
              onClick={() => setDeleting(null)}
              className="px-4 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700"
            >
              Delete
            </button>
          </>
        }
      >
        <p>
          Delete the{" "}
          <strong className="text-black">
            ${deleting?.amount.toFixed(2)} {deleting?.method}
          </strong>{" "}
          payment from invoice{" "}
          <strong className="text-black">{deleting?.invoice.number}</strong>?
        </p>
        <p className="mt-2 text-gray-700 text-sm">
          The invoice balance and status will recalculate automatically.
        </p>
      </Modal>
    </div>
  );
}

function PaymentEditModal({
  payment,
  onClose,
  onSubmit,
}: {
  payment: Payment | null;
  onClose: () => void;
  onSubmit: (updated: { amount: number; method: string; notes: string; paidAt: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount.toFixed(2));
      setMethod(payment.method);
      setNotes(payment.notes ?? "");
      setPaidAt(new Date(payment.paidAt).toISOString().slice(0, 10));
    }
  }, [payment]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (amt <= 0) return;
    setBusy(true);
    await onSubmit({
      amount: amt,
      method,
      notes,
      paidAt: new Date(paidAt + "T12:00:00").toISOString(),
    });
    setBusy(false);
  }

  return (
    <Modal
      open={payment !== null}
      onClose={onClose}
      title={`Edit payment — ${payment?.invoice.number ?? ""}`}
      actions={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || Number(amount) <= 0}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Amount ($)</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full border border-gray-400 p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border border-gray-400 p-2 rounded bg-white text-black"
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="CHECK">Check</option>
            <option value="TRANSFER">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full border border-gray-400 p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-400 p-2 rounded text-black"
          />
        </div>
      </div>
    </Modal>
  );
}