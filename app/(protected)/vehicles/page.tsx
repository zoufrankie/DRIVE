"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  trim: string | null;
  year: number | null;
  vin: string | null;
  licensePlate: string | null;
  color: string | null;
  owners: { client: { id: string; name: string } }[];
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vehicles?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          const text = await res.text();
          setError(`API error ${res.status}: ${text.slice(0, 300)}`);
          setVehicles([]);
          setLoading(false);
          return;
        }
        setVehicles(await res.json());
      } catch (e) {
        setError(String(e));
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-black">Vehicles</h1>
        <Link
          href="/vehicles/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
        >
          + New Vehicle
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by VIN, plate, make, or model..."
        className="w-full border border-gray-400 bg-white text-black placeholder:text-gray-600 p-2.5 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm mb-4 whitespace-pre-wrap font-mono">
          {error}
        </div>
      )}

      {loading && vehicles.length === 0 ? (
        <p className="text-gray-700 text-sm">Loading…</p>
      ) : vehicles.length === 0 && !error ? (
        <p className="text-gray-700 text-sm">
          {q ? "No vehicles match that search." : "No vehicles yet. Add your first one."}
        </p>
      ) : (
        <div className="bg-white rounded shadow-sm border border-gray-300 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr] gap-4 px-5 py-3 bg-gray-100 border-b border-gray-300 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Vehicle</div>
            <div>Year</div>
            <div>Color</div>
            <div>Plate</div>
            <div>Owner(s)</div>
          </div>
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/vehicles/${v.id}`}
              className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr] gap-4 px-5 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 text-sm"
            >
              <div className="font-semibold text-black truncate">
                {v.make} {v.model}
                {v.trim && <span className="text-gray-700 font-normal"> {v.trim}</span>}
              </div>
              <div className="text-black">{v.year ?? "—"}</div>
              <div className="text-black truncate">{v.color ?? "—"}</div>
              <div className="text-black truncate font-mono text-xs">
                {v.licensePlate ?? "—"}
              </div>
              <div className="text-black truncate">
                {v.owners.map((o) => o.client.name).join(", ") || "—"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}