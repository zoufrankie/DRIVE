"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchSelect from "@/components/SearchSelect";
import Modal from "@/components/Modal";

type Client = { id: string; name: string };
type Vehicle = {
  id: string;
  year: number | null;
  make: string;
  model: string;
  licensePlate: string | null;
  vin: string | null;
  owners: { client: { id: string } }[];
};

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get("clientId") ?? "";
  const presetVehicleId = searchParams.get("vehicleId") ?? "";

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
    ]).then(([c, v]) => {
      if (Array.isArray(c)) setClients(c);
      if (Array.isArray(v)) setVehicles(v);
    });
  }, []);

  useEffect(() => {
    if (presetClientId && clients.length > 0) setClientId(presetClientId);
    if (presetVehicleId && vehicles.length > 0) setVehicleId(presetVehicleId);
  }, [presetClientId, presetVehicleId, clients, vehicles]);

  const vehicleOptions = clientId
    ? vehicles
        .filter((v) => v.owners.some((o) => o.client.id === clientId))
        .map((v) => ({
          id: v.id,
          label: [v.year, v.make, v.model].filter(Boolean).join(" "),
          sublabel: [v.licensePlate, v.vin].filter(Boolean).join(" · "),
        }))
    : [];

  useEffect(() => {
    if (!clientId) return setVehicleId("");
    if (!vehicleOptions.some((v) => v.id === vehicleId)) setVehicleId("");
  }, [clientId, vehicleOptions, vehicleId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return setErrorModal("Please select a client.");
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, vehicleId: vehicleId || null, notes }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorModal(data.error ?? "Something went wrong.");
      return;
    }
    const invoice = await res.json();
    router.push(`/invoices/${invoice.id}`);
    router.refresh();
  }

  return (
    <div className="p-8 w-full">
      <Link href="/invoices" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to Invoices
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-6 text-black">New Invoice</h1>

      <form
        onSubmit={submit}
        autoComplete="off"
        className="bg-white p-6 rounded shadow-sm border border-gray-300 space-y-5 max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Client *</label>
            <SearchSelect
              options={clients.map((c) => ({ id: c.id, label: c.name }))}
              value={clientId}
              onChange={setClientId}
              placeholder="Search clients..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Vehicle</label>
            <SearchSelect
              options={vehicleOptions}
              value={vehicleId}
              onChange={setVehicleId}
              placeholder={
                clientId ? "Search this client's vehicles..." : "Pick a client first"
              }
              emptyText={
                clientId ? "This client has no vehicles" : "Pick a client first"
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-3">
          Labor rate and tax rate come from Settings. You can adjust them per-invoice on
          the invoice page.
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Invoice"}
          </button>
          <Link
            href="/invoices"
            className="px-5 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Link>
        </div>
      </form>

      <Modal
        open={errorModal !== null}
        onClose={() => setErrorModal(null)}
        title="Notice"
        actions={
          <button
            onClick={() => setErrorModal(null)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            OK
          </button>
        }
      >
        <p className="whitespace-pre-wrap">{errorModal}</p>
      </Modal>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-700 text-sm">Loading...</div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}