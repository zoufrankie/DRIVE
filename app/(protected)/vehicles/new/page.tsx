"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ClientPicker from "@/components/ClientPicker";
import Modal from "@/components/Modal";

const INITIAL_FORM = {
  vin: "",
  licensePlate: "",
  vehicleType: "",
  year: "",
  make: "",
  model: "",
  trim: "",
  transmission: "",
  drivenWheels: "",
  engine: "",
  odometer: "",
  color: "",
  notes: "",
};

function NewVehicleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get("clientId") ?? "";

  const [form, setForm] = useState(INITIAL_FORM);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    setForm(INITIAL_FORM);
    setOwnerIds(presetClientId ? [presetClientId] : []);
    setErrorModal(null);
    setSaving(false);
  }, [presetClientId]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function decodeVin() {
    if (form.vin.length !== 17) {
      setErrorModal("Enter a full 17-character VIN first.");
      return;
    }
    setDecoding(true);
    try {
      const res = await fetch("/api/vin/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: form.vin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorModal(data.error ?? "Could not decode this VIN.");
        return;
      }

      const d = data.decoded ?? {};
      const filled: string[] = [];
      if (d.make) filled.push("make");
      if (d.model) filled.push("model");
      if (d.year) filled.push("year");
      if (d.trim) filled.push("trim");
      if (d.vehicleType) filled.push("type");
      if (d.transmission) filled.push("transmission");
      if (d.drivenWheels) filled.push("drivetrain");
      if (d.engine) filled.push("engine");

      setForm((f) => {
        const next = { ...f };
        if (d.make) next.make = String(d.make);
        if (d.model) next.model = String(d.model);
        if (d.year) next.year = String(d.year);
        if (d.trim) next.trim = String(d.trim);
        if (d.vehicleType) next.vehicleType = String(d.vehicleType);
        if (d.transmission) next.transmission = String(d.transmission);
        if (d.drivenWheels) next.drivenWheels = String(d.drivenWheels);
        if (d.engine) next.engine = String(d.engine);
        return next;
      });

      if (filled.length === 0) {
        setErrorModal("NHTSA recognized the VIN but returned no vehicle details. Fill them in manually.");
      } else if (data.cached) {
        setErrorModal(`Loaded from cache (${filled.length} fields). Review and save.`);
      } else {
        const missing: string[] = [];
        if (!d.make) missing.push("make");
        if (!d.model) missing.push("model");
        if (!d.year) missing.push("year");
        const note = missing.length ? `\n\nNHTSA did not return: ${missing.join(", ")}. Fill those in manually.` : "";
        setErrorModal(`Decoded ${filled.length} field${filled.length === 1 ? "" : "s"} from NHTSA. Review and save.${note}`);
      }
    } catch {
      setErrorModal("Network error while decoding. Check your connection and try again.");
    } finally {
      setDecoding(false);
    }
  }

  function handleCancel() {
    setForm(INITIAL_FORM);
    setOwnerIds([]);
    router.push("/vehicles");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.make.trim() || !form.model.trim()) {
      setErrorModal("Make and model are required.");
      return;
    }
    if (ownerIds.length === 0) {
      setErrorModal("Please select at least one owner.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clientIds: ownerIds }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorModal(data.error ?? "Something went wrong while saving.");
      return;
    }
    const vehicle = await res.json();
    router.push(`/vehicles/${vehicle.id}`);
    router.refresh();
  }

  const vinReady = form.vin.length === 17;

  return (
    <div className="p-8 w-full">
      <Link href="/vehicles" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to Vehicles
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-6 text-black">New Vehicle</h1>

      <form
        onSubmit={submit}
        autoComplete="off"
        className="bg-white p-6 rounded shadow-sm border border-gray-300 space-y-6"
      >
        {/* VIN + Odometer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-black">VIN</label>
            <div className="flex gap-2">
              <input
                value={form.vin}
                onChange={(e) =>
                  update("vin", e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ""))
                }
                placeholder="17-character VIN"
                maxLength={17}
                className="flex-1 border border-gray-400 p-2 rounded font-mono text-sm text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={decodeVin}
                disabled={decoding || !vinReady}
                className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                title={!vinReady ? "Enter a full 17-character VIN first" : "Look up vehicle details"}
              >
                {decoding ? "Decoding…" : "Decode VIN"}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {form.vin.length}/17 characters
              {form.vin.length > 0 && form.vin.length < 17 && " — keep typing"}
              {form.vin.length === 17 && " — ready to decode"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Odometer</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.odometer}
              onChange={(e) => update("odometer", e.target.value.replace(/\D/g, ""))}
              placeholder="85000"
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 3x3 grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Year</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.year}
              onChange={(e) => update("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2018"
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Make *</label>
            <input
              value={form.make}
              onChange={(e) => update("make", e.target.value)}
              placeholder="Toyota"
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Model *</label>
            <input
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="Corolla"
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Trim</label>
            <input
              value={form.trim}
              onChange={(e) => update("trim", e.target.value)}
              placeholder="LE, XSE…"
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Vehicle Type</label>
            <input
              value={form.vehicleType}
              onChange={(e) => update("vehicleType", e.target.value)}
              placeholder="Sedan, SUV…"
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">License Plate</label>
            <input
              value={form.licensePlate}
              onChange={(e) => update("licensePlate", e.target.value.toUpperCase())}
              className="w-full border border-gray-400 p-2 rounded font-mono text-sm text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Transmission</label>
            <select
              value={form.transmission}
              onChange={(e) => update("transmission", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
              <option value="CVT">CVT</option>
              <option value="Dual-Clutch">Dual-Clutch</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Driven Wheels</label>
            <select
              value={form.drivenWheels}
              onChange={(e) => update("drivenWheels", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              <option value="FWD">FWD</option>
              <option value="RWD">RWD</option>
              <option value="AWD">AWD</option>
              <option value="4WD">4WD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Engine</label>
            <input
              value={form.engine}
              onChange={(e) => update("engine", e.target.value)}
              placeholder="2.0L I4"
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1 text-black">Color</label>
            <input
              value={form.color}
              onChange={(e) => update("color", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-black">
            Owner(s) * <span className="text-gray-600 font-normal">— search and click to add</span>
          </label>
          <ClientPicker selectedIds={ownerIds} onChange={setOwnerIds} />
          {ownerIds.length > 0 && (
            <p className="text-xs text-gray-700 mt-2">
              {ownerIds.length} owner{ownerIds.length === 1 ? "" : "s"} selected
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Vehicle"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>

      <Modal
        open={errorModal !== null}
        onClose={() => setErrorModal(null)}
        title="VIN Decoder"
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

export default function NewVehiclePage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-700 text-sm">Loading...</div>}>
      <NewVehicleForm />
    </Suspense>
  );
}