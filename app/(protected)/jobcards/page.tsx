"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Jobcard = {
  id: string;
  number: string;
  status: string;
  total: number;
  amountPaid: number;
  jobStartedAt: string;
  completedAt: string | null;
  client: { name: string };
  vehicle:
    | { year: number | null; make: string; model: string; licensePlate: string | null }
    | null;
};

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-purple-100 text-purple-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-300 text-gray-900",
  DECLINED: "bg-red-100 text-red-800",
};

export default function JobcardsPage() {
  const [jobcards, setJobcards] = useState<Jobcard[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/invoices?jobcards=true&q=${encodeURIComponent(q)}&status=${statusFilter}`
        );
        if (!res.ok) {
          setError(`API error ${res.status}`);
          setJobcards([]);
          return;
        }
        const data = await res.json();
        setJobcards(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, statusFilter]);

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-black">Jobcards</h1>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by jobcard #, client, or VIN..."
          className="flex-1 border border-gray-400 bg-white text-black placeholder:text-gray-600 p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-400 bg-white text-black p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {loading && jobcards.length === 0 ? (
        <p className="text-gray-700 text-sm">Loading…</p>
      ) : jobcards.length === 0 && !error ? (
        <p className="text-gray-700 text-sm">
          {q || statusFilter
            ? "No jobcards match those filters."
            : "No jobcards yet. Start a job from any invoice to see it here."}
        </p>
      ) : (
        <div className="bg-white rounded shadow-sm border border-gray-300 overflow-hidden">
          <div className="grid grid-cols-[1fr_1.5fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-100 border-b border-gray-300 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Number</div>
            <div>Client</div>
            <div>Vehicle</div>
            <div>Started</div>
            <div>Status</div>
            <div className="text-right">Total</div>
            <div className="text-right">Balance</div>
          </div>
          {jobcards.map((j) => {
            const balance = j.total - j.amountPaid;
            const vehicleText = j.vehicle
              ? [j.vehicle.year, j.vehicle.make, j.vehicle.model].filter(Boolean).join(" ")
              : "—";
            return (
              <Link
                key={j.id}
                href={`/invoices/${j.id}`}
                className="grid grid-cols-[1fr_1.5fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 text-sm items-center"
              >
                <div className="font-mono text-black font-semibold">{j.number}</div>
                <div className="text-black truncate">{j.client.name}</div>
                <div className="text-black truncate">{vehicleText}</div>
                <div className="text-black text-xs">
                  {new Date(j.jobStartedAt).toLocaleDateString()}
                </div>
                <div>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                      STATUS_COLORS[j.status] ?? "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {j.status}
                  </span>
                </div>
                <div className="text-black font-mono text-right">
                  ${j.total.toFixed(2)}
                </div>
                <div
                  className={`font-mono text-right ${
                    balance > 0.01 ? "text-orange-700" : "text-green-700"
                  }`}
                >
                  {balance > 0.01 ? `$${balance.toFixed(2)}` : "Paid"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}