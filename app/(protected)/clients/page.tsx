"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  _count: { ownerships: number; invoices: number };
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          const text = await res.text();
          setError(`API error ${res.status}: ${text.slice(0, 300)}`);
          setClients([]);
          setLoading(false);
          return;
        }
        setClients(await res.json());
      } catch (e) {
        setError(String(e));
        setClients([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-black">Clients</h1>
        <Link
          href="/clients/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
        >
          + New Client
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, phone, or city..."
        className="w-full border border-gray-400 bg-white text-black placeholder:text-gray-600 p-2.5 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm mb-4 whitespace-pre-wrap font-mono">
          {error}
        </div>
      )}

      {loading && clients.length === 0 ? (
        <p className="text-gray-700 text-sm">Loading…</p>
      ) : clients.length === 0 && !error ? (
        <p className="text-gray-700 text-sm">
          {q ? "No clients match that search." : "No clients yet. Add your first one."}
        </p>
      ) : (
        <div className="bg-white rounded shadow-sm border border-gray-300 overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1.2fr_0.8fr_0.6fr] gap-4 px-5 py-3 bg-gray-100 border-b border-gray-300 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Location</div>
            <div>Vehicles</div>
            <div>Invoices</div>
          </div>
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="grid grid-cols-[1.5fr_1.5fr_1fr_1.2fr_0.8fr_0.6fr] gap-4 px-5 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 text-sm"
            >
              <div className="font-semibold text-black truncate">{c.name}</div>
              <div className="text-black truncate">{c.email ?? "—"}</div>
              <div className="text-black truncate">{c.phone ?? "—"}</div>
              <div className="text-black truncate">
                {[c.city, c.state].filter(Boolean).join(", ") || "—"}
              </div>
              <div className="text-black">{c._count.ownerships}</div>
              <div className="text-black">{c._count.invoices}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}