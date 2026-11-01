"use client";
import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import SearchSelect from "@/components/SearchSelect";

type Line = {
  id?: string;
  kind: "PART" | "LABOR";
  description: string;
  cost: number;
  price: number;
  qty: number;
  unit: string;
  taxable: boolean;
  approved: boolean;
  amount: number;
  group: string;
  sortOrder: number;
  _dirty?: boolean;
};

type Invoice = {
  id: string;
  number: string;
  status: string;
  notes: string | null;
  warranty: string | null;
  discount: number;
  otherCharges: number;
  taxRate: number;
  issueDate: string;
  client: {
    id: string; name: string; email: string | null; phone: string | null;
    street: string | null; city: string | null; state: string | null; zip: string | null;
  } | null;
  vehicle: {
    id: string; year: number | null; make: string; model: string;
    trim: string | null; licensePlate: string | null; vin: string | null;
    odometer: number | null;
  } | null;
  lines: Line[];
};

const STATUS_OPTIONS = [
  { value: "ESTIMATE", label: "Estimate", color: "bg-amber-100 text-amber-800" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-800" },
  { value: "APPROVED", label: "Approved", color: "bg-purple-100 text-purple-800" },
  { value: "DECLINED", label: "Declined", color: "bg-red-100 text-red-800" },
  { value: "PAID", label: "Paid", color: "bg-green-100 text-green-800" },
  { value: "NOT_PAID", label: "Not Paid", color: "bg-orange-100 text-orange-800" },
];
function stripLeadingZeros(v: string): string {
  if (v === '' || v === '0') return v;
  if (v.startsWith('0.')) return v;
  return v.replace(/^0+(?=\d)/, '');
}

function statusMeta(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0];
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<
    { id: string; label: string; sublabel?: string; owners: string[] }[]
  >([]);
  const [defaultLaborRate, setDefaultLaborRate] = useState(100);
  const [odoDraft, setOdoDraft] = useState<string>("");
  const [discountDraft, setDiscountDraft] = useState<string>("");
  const [otherChargesDraft, setOtherChargesDraft] = useState<string>("");
  const [taxRateDraft, setTaxRateDraft] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`);
        return r.json();
      }),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([inv, c, v, s]) => {
        setInvoice(inv);
        const normalizedLines = (inv.lines ?? []).map((l: any) => ({
          ...l,
          group: l.group ?? "",
          unit: l.unit ?? "",
          description: l.description ?? "",
        }));
        setLines(normalizedLines);
        setOdoDraft(inv.vehicle?.odometer != null ? String(inv.vehicle.odometer) : "");
        setDiscountDraft(inv.discount ? String(inv.discount) : "");
        setOtherChargesDraft(inv.otherCharges ? String(inv.otherCharges) : "");
        setTaxRateDraft(inv.taxRate != null ? String(inv.taxRate) : "");
        if (Array.isArray(c)) setClients(c);
        if (Array.isArray(v))
          setVehicles(
            v.map((veh: any) => ({
              id: veh.id,
              label: [veh.year, veh.make, veh.model].filter(Boolean).join(" "),
              sublabel: [veh.licensePlate, veh.vin].filter(Boolean).join(" · "),
              owners: veh.owners.map((o: any) => o.client.id),
            }))
          );
        if (s?.defaultLaborRate != null)
          setDefaultLaborRate(Number(s.defaultLaborRate) || 100);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [lines]
  );
  const taxableSubtotal = useMemo(
    () => lines.filter((l) => l.taxable).reduce((s, l) => s + l.amount, 0),
    [lines]
  );
  const discount = invoice?.discount ?? 0;
  const otherCharges = invoice?.otherCharges ?? 0;
  const taxRate = invoice?.taxRate ?? 0;
  const taxableBase = Math.max(0, taxableSubtotal - discount);
  const taxAmount = taxableBase * (taxRate / 100);
  const total = subtotal + otherCharges - discount + taxAmount;

  const partsProfit = lines
    .filter((l) => l.kind === "PART")
    .reduce((s, l) => s + (l.price - l.cost) * l.qty, 0);
  const laborProfit = lines
    .filter((l) => l.kind === "LABOR")
    .reduce((s, l) => s + (l.price - l.cost) * l.qty, 0);
  const netProfit = partsProfit + laborProfit - discount;

  async function patchInvoice(patch: Partial<Invoice>) {
    if (!invoice) return;
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (res.ok) setInvoice(await res.json());
  }

  async function saveOdometer() {
    if (!invoice?.vehicle) return;
    const n = odoDraft.trim() === "" ? null : Number(odoDraft);
    if (n !== null && isNaN(n as number)) return;
    await fetch(`/api/vehicles/${invoice.vehicle.id}/odometer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ odometer: n }),
    });
    setInvoice((inv) =>
      inv && inv.vehicle ? { ...inv, vehicle: { ...inv.vehicle, odometer: n } } : inv
    );
  }

  function addLine(kind: "PART" | "LABOR") {
    setLines((prev) => {
      const isLabor = kind === "LABOR";
      const price = isLabor ? defaultLaborRate : 0;
      return [
        ...prev,
        {
          kind,
          description: "",
          cost: 0,
          price,
          qty: 1,
          unit: isLabor ? "hr" : "ea",
          taxable: true,
          approved: true,
          amount: isLabor ? price : 0,
          group: "",
          sortOrder: prev.length,
          _dirty: true,
        },
      ];
    });
  }

  function updateLine<K extends keyof Line>(idx: number, key: K, value: Line[K]) {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[idx], [key]: value };
      line.amount = (Number(line.qty) || 0) * (Number(line.price) || 0);
      line._dirty = true;
      next[idx] = line;
      return next;
    });
  }

  function moveLine(idx: number, direction: "up" | "down") {
    setLines((prev) => {
      const line = prev[idx];
      const sameKindIdxs = prev
        .map((l, i) => (l.kind === line.kind ? i : -1))
        .filter((i) => i >= 0);
      const posInKind = sameKindIdxs.indexOf(idx);
      const targetPos = direction === "up" ? posInKind - 1 : posInKind + 1;
      if (targetPos < 0 || targetPos >= sameKindIdxs.length) return prev;
      const targetIdx = sameKindIdxs[targetPos];
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next.map((l, i) => ({ ...l, sortOrder: i, _dirty: true }));
    });
  }

  async function removeLine(idx: number) {
    const line = lines[idx];
    if (line.id && invoice) {
      await fetch(
        `/api/invoices/${invoice.id}/lines?lineId=${line.id}&invoiceId=${invoice.id}`,
        { method: "DELETE" }
      );
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
    if (invoice) {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) setInvoice(await res.json());
    }
  }

  async function saveLines() {
    if (!invoice) return;
    setBusy(true);
    for (const line of lines) {
      if (!line._dirty) continue;
      const payload = {
        kind: line.kind,
        description: line.description,
        cost: line.cost,
        price: line.price,
        qty: line.qty,
        unit: line.unit,
        taxable: line.taxable,
        approved: line.approved,
        group: line.group,
        sortOrder: line.sortOrder,
      };
      if (line.id) {
        await fetch(`/api/invoices/${invoice.id}/lines`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineId: line.id, invoiceId: invoice.id, ...payload }),
        });
      } else {
        await fetch(`/api/invoices/${invoice.id}/lines`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    }
    const res = await fetch(`/api/invoices/${invoice.id}`);
    if (res.ok) {
      const updated = await res.json();
      setInvoice(updated);
      setLines(
        (updated.lines ?? []).map((l: any) => ({
          ...l,
          group: l.group ?? "",
          unit: l.unit ?? "",
          description: l.description ?? "",
        }))
      );
    }
    setBusy(false);
  }

  async function setGroupApproved(kind: "PART" | "LABOR", approved: boolean) {
    if (!invoice) return;
    setLines((prev) =>
      prev.map((l) => (l.kind === kind ? { ...l, approved, _dirty: true } : l))
    );
    await fetch(`/api/invoices/${invoice.id}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: invoice.id, kind, approved }),
    });
    setLines((prev) =>
      prev.map((l) => (l.kind === kind && l.id ? { ...l, _dirty: false } : l))
    );
  }

  async function toggleLineGroupApproval(targetLine: Line) {
    if (!invoice) return;
    const group = (targetLine.group ?? "").trim();
    const next = !targetLine.approved;

    // No group -> toggle only this row
    if (!group) {
      setLines((prev) =>
        prev.map((l) => (l === targetLine ? { ...l, approved: next, _dirty: true } : l))
      );
      if (targetLine.id) {
        await fetch(`/api/invoices/${invoice.id}/lines`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineId: targetLine.id,
            invoiceId: invoice.id,
            kind: targetLine.kind,
            description: targetLine.description,
            cost: targetLine.cost,
            price: targetLine.price,
            qty: targetLine.qty,
            unit: targetLine.unit,
            taxable: targetLine.taxable,
            approved: next,
            group: targetLine.group,
            sortOrder: targetLine.sortOrder,
          }),
        });
        setLines((prev) =>
          prev.map((l) => (l === targetLine ? { ...l, _dirty: false } : l))
        );
      }
      return;
    }

    // Group present -> toggle ALL lines (parts + labor) that share this group
    setLines((prev) =>
      prev.map((l) =>
        (l.group ?? "").trim() === group ? { ...l, approved: next, _dirty: true } : l
      )
    );
    await fetch(`/api/invoices/${invoice.id}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: invoice.id, group, approved: next }),
    });
    setLines((prev) =>
      prev.map((l) =>
        (l.group ?? "").trim() === group && l.id ? { ...l, _dirty: false } : l
      )
    );
  }

  async function doDelete() {
    if (!invoice) return;
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/invoices");
      router.refresh();
    }
  }

  if (loading) return <div className="p-8 text-gray-700 text-sm">Loading...</div>;
  if (error)
    return (
      <div className="p-8 m-8 bg-red-50 border border-red-300 text-red-800 text-sm rounded whitespace-pre-wrap">
        {error}
      </div>
    );
  if (!invoice) return null;

  const clientVehicleOptions = vehicles
    .filter((v) => !invoice.client || v.owners.includes(invoice.client.id))
    .map((v) => ({ id: v.id, label: v.label, sublabel: v.sublabel }));
  const meta = statusMeta(invoice.status);

  const partsLines = lines.filter((l) => l.kind === "PART");
  const laborLines = lines.filter((l) => l.kind === "LABOR");
  const partsApproved = partsLines.length > 0 && partsLines.every((l) => l.approved);
  const partsDeclined = partsLines.length > 0 && partsLines.every((l) => !l.approved);
  const laborApproved = laborLines.length > 0 && laborLines.every((l) => l.approved);
  const laborDeclined = laborLines.length > 0 && laborLines.every((l) => !l.approved);

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 min-w-0 p-8 space-y-6">
        {/* Print-only header */}
        <div className="print-only mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">DRIVE</h1>
              <p className="text-xs uppercase tracking-widest mt-1">Shop Management</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">{invoice.number}</div>
              <div className="text-sm">{new Date(invoice.issueDate).toLocaleDateString()}</div>
              <div className="text-sm font-semibold uppercase mt-1">{meta.label}</div>
            </div>
          </div>
          {invoice.client && (
            <div className="mt-6 text-sm">
              <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Bill To</div>
              <div className="font-semibold">{invoice.client.name}</div>
              {invoice.client.email && <div>{invoice.client.email}</div>}
              {invoice.client.phone && <div>{invoice.client.phone}</div>}
              {invoice.client.street && <div>{invoice.client.street}</div>}
              {(invoice.client.city || invoice.client.state) && (
                <div>
                  {[invoice.client.city, invoice.client.state].filter(Boolean).join(", ")}{" "}
                  {invoice.client.zip}
                </div>
              )}
            </div>
          )}
          {invoice.vehicle && (
            <div className="mt-4 text-sm">
              <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Vehicle</div>
              <div className="font-semibold">
                {[invoice.vehicle.year, invoice.vehicle.make, invoice.vehicle.model]
                  .filter(Boolean)
                  .join(" ")}
                {invoice.vehicle.trim && " " + invoice.vehicle.trim}
              </div>
              {invoice.vehicle.licensePlate && <div>Plate: {invoice.vehicle.licensePlate}</div>}
              {invoice.vehicle.vin && <div>VIN: {invoice.vehicle.vin}</div>}
              {invoice.vehicle.odometer != null && (
                <div>Odometer: {invoice.vehicle.odometer.toLocaleString()} mi</div>
              )}
            </div>
          )}
        </div>

        <div className="no-print flex items-center justify-between">
          <Link href="/invoices" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Invoices
          </Link>
          <div className="flex gap-2">
            <button
              onClick={saveLines}
              disabled={busy || !lines.some((l) => l._dirty)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save Lines"}
            </button>
            <button
              onClick={() => window.print()}
              className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900"
            >
              Print
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="bg-white text-red-600 border border-red-300 px-4 py-2 rounded text-sm hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Customer & Vehicle */}
        <section className="no-print bg-white border border-gray-300 rounded p-5">
          <h2 className="text-lg font-bold text-black mb-4">Customer &amp; Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide text-gray-700">Client</span>
                {invoice.client && (
                  <div className="flex gap-2">
                    <Link href={`/clients/${invoice.client.id}`} className="text-xs text-blue-700 hover:underline">View</Link>
                    <button
                      onClick={() => patchInvoice({ clientId: invoice.client!.id, vehicleId: null } as any)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Unlink
                    </button>
                  </div>
                )}
              </div>
              {invoice.client ? (
                <div className="text-sm">
                  <div className="font-semibold text-black">{invoice.client.name}</div>
                  {invoice.client.email && <div className="text-gray-800">{invoice.client.email}</div>}
                  {invoice.client.phone && <div className="text-gray-800">{invoice.client.phone}</div>}
                  {(invoice.client.city || invoice.client.state) && (
                    <div className="text-gray-800">
                      {[invoice.client.city, invoice.client.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-sm">
                  <SearchSelect
                    options={clients.map((c) => ({ id: c.id, label: c.name }))}
                    value=""
                    onChange={(clientId) => patchInvoice({ clientId } as any)}
                    placeholder="Search clients..."
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide text-gray-700">Vehicle</span>
                {invoice.vehicle && (
                  <div className="flex gap-2">
                    <Link href={`/vehicles/${invoice.vehicle.id}`} className="text-xs text-blue-700 hover:underline">View</Link>
                    <button
                      onClick={() => patchInvoice({ vehicleId: null } as any)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Unlink
                    </button>
                  </div>
                )}
              </div>
              {invoice.vehicle ? (
                <div className="text-sm">
                  <div className="font-semibold text-black">
                    {[invoice.vehicle.year, invoice.vehicle.make, invoice.vehicle.model]
                      .filter(Boolean)
                      .join(" ")}
                    {invoice.vehicle.trim && (
                      <span className="text-gray-700 font-normal ml-1">{invoice.vehicle.trim}</span>
                    )}
                  </div>
                  {invoice.vehicle.licensePlate && (
                    <div className="text-gray-800 font-mono text-xs">Plate: {invoice.vehicle.licensePlate}</div>
                  )}
                  {invoice.vehicle.vin && (
                    <div className="text-gray-800 font-mono text-xs">VIN: {invoice.vehicle.vin}</div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs text-gray-700 uppercase tracking-wide">Odometer</label>
                    <input
                      type="number"
                      value={odoDraft}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setOdoDraft(stripLeadingZeros(e.target.value))}
                      onBlur={saveOdometer}
                      placeholder="85000"
                      className="w-32 border border-gray-400 p-1 rounded text-black text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500">mi</span>
                  </div>
                </div>
              ) : (
                <div className="max-w-sm">
                  <SearchSelect
                    options={clientVehicleOptions}
                    value=""
                    onChange={(vehicleId) => patchInvoice({ vehicleId } as any)}
                    placeholder={invoice.client ? "Search this client's vehicles..." : "Assign a client first"}
                    emptyText={invoice.client ? "This client has no vehicles" : "Assign a client first"}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="no-print flex items-center gap-4 text-sm">
          <button
            onClick={() => setPlaceholder("Canned Jobs")}
            className="text-blue-700 hover:text-blue-900 hover:underline font-medium"
          >
            + Canned Jobs
          </button>
        </div>

        <LineTable
          title="Parts"
          kind="PART"
          lines={partsLines}
          allLines={lines}
          approved={partsApproved}
          declined={partsDeclined}
          onGroupApprove={(a) => setGroupApproved("PART", a)}
          onToggleLineGroup={toggleLineGroupApproval}
          onUpdate={updateLine}
          onMove={moveLine}
          onRemove={removeLine}
          onAdd={() => addLine("PART")}
        />

        <div className="no-print flex items-center gap-4 text-sm">
          <button
            onClick={() => setPlaceholder("Parts for future")}
            className="text-blue-700 hover:text-blue-900 hover:underline font-medium"
          >
            + Parts for future
          </button>
        </div>

        <LineTable
          title="Labor"
          kind="LABOR"
          lines={laborLines}
          allLines={lines}
          approved={laborApproved}
          declined={laborDeclined}
          onGroupApprove={(a) => setGroupApproved("LABOR", a)}
          onToggleLineGroup={toggleLineGroupApproval}
          onUpdate={updateLine}
          onMove={moveLine}
          onRemove={removeLine}
          onAdd={() => addLine("LABOR")}
        />

        <div className="no-print flex items-center gap-4 text-sm">
          <button
            onClick={() => setPlaceholder("Default labor")}
            className="text-blue-700 hover:text-blue-900 hover:underline font-medium"
          >
            + Default labor
          </button>
        </div>

        {/* Notes & Warranty */}
        <section className="bg-white border border-gray-300 rounded p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Notes</label>
            <textarea
              defaultValue={invoice.notes ?? ""}
              onBlur={(e) => patchInvoice({ notes: e.target.value } as any)}
              rows={3}
              className="w-full border border-gray-400 p-2 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:p-0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Warranty</label>
            <textarea
              defaultValue={invoice.warranty ?? ""}
              onBlur={(e) => patchInvoice({ warranty: e.target.value } as any)}
              rows={3}
              className="w-full border border-gray-400 p-2 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:p-0"
            />
          </div>
        </section>

        {/* Print-only totals */}
        <div className="print-only mt-8 border-t border-gray-300 pt-4">
          <div className="flex justify-end">
            <div className="w-64 text-sm">
              <div className="flex justify-between py-1"><span>Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between py-1"><span>Tax ({taxRate}%)</span><span className="font-mono">${taxAmount.toFixed(2)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between py-1"><span>Discount</span><span className="font-mono">-${discount.toFixed(2)}</span></div>
              )}
              {otherCharges > 0 && (
                <div className="flex justify-between py-1"><span>Other charges</span><span className="font-mono">${otherCharges.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between py-2 mt-2 border-t border-gray-300 font-bold text-lg">
                <span>Total</span><span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="no-print w-80 shrink-0 border-l border-gray-300 bg-white p-5 overflow-y-auto max-h-screen sticky top-0">
        <div className="mb-5">
          <div className="text-xs uppercase tracking-wide text-gray-700">Invoice</div>
          <div className="text-2xl font-mono font-bold text-black">{invoice.number}</div>
          <select
            value={invoice.status}
            onChange={(e) => patchInvoice({ status: e.target.value } as any)}
            className={`mt-2 w-full text-sm font-semibold rounded px-3 py-1.5 border-none outline-none cursor-pointer ${meta.color}`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-xs uppercase tracking-wide text-gray-700 mb-1">Issue Date</label>
          <input
            type="date"
            value={new Date(invoice.issueDate).toISOString().slice(0, 10)}
            onChange={(e) => patchInvoice({ issueDate: new Date(e.target.value).toISOString() } as any)}
            className="w-full border border-gray-400 p-2 rounded text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <hr className="my-4 border-gray-300" />

        <div className="space-y-2 text-sm">
          <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-800">Tax Rate %</span>
            <input
              type="text"
              inputMode="decimal"
              value={taxRateDraft}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const v = stripLeadingZeros(e.target.value); setTaxRateDraft(v);
                const n = v === "" ? 0 : Number(v) || 0;
                setInvoice((inv) => inv ? { ...inv, taxRate: n } : inv);
              }}
              onBlur={() => {
                const n = taxRateDraft === "" ? 0 : Number(taxRateDraft) || 0;
                patchInvoice({ taxRate: n } as any);
              }}
              className="w-20 border border-gray-400 p-1 rounded text-black text-right font-mono"
            />
          </div>
          <Row label="Tax" value={`$${taxAmount.toFixed(2)}`} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-800">Discount</span>
            <input
              type="text"
              inputMode="decimal"
              value={discountDraft}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const v = stripLeadingZeros(e.target.value); setDiscountDraft(v);
                const n = v === "" ? 0 : Number(v) || 0;
                setInvoice((inv) => inv ? { ...inv, discount: n } : inv);
              }}
              onBlur={() => {
                const n = discountDraft === "" ? 0 : Number(discountDraft) || 0;
                patchInvoice({ discount: n } as any);
              }}
              className="w-20 border border-gray-400 p-1 rounded text-black text-right font-mono"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-800">Other Charges</span>
            <input
              type="text"
              inputMode="decimal"
              value={otherChargesDraft}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const v = stripLeadingZeros(e.target.value); setOtherChargesDraft(v);
                const n = v === "" ? 0 : Number(v) || 0;
                setInvoice((inv) => inv ? { ...inv, otherCharges: n } : inv);
              }}
              onBlur={() => {
                const n = otherChargesDraft === "" ? 0 : Number(otherChargesDraft) || 0;
                patchInvoice({ otherCharges: n } as any);
              }}
              className="w-20 border border-gray-400 p-1 rounded text-black text-right font-mono"
            />
          </div>
          <div className="flex justify-between pt-2 mt-2 border-t border-gray-300 font-bold text-lg text-black">
            <span>Total</span><span className="font-mono">${total.toFixed(2)}</span>
          </div>
        </div>

        <hr className="my-4 border-gray-300" />

        <div className="space-y-2 text-sm">
          <div className="text-xs uppercase tracking-wide text-gray-700 mb-2">Profit</div>
          <Row label="Profit from Parts" value={`$${partsProfit.toFixed(2)}`} />
          <Row label="Profit from Labor" value={`$${laborProfit.toFixed(2)}`} />
          <Row label="Discount Subtraction" value={`-$${discount.toFixed(2)}`} />
          <div className="flex justify-between pt-2 mt-2 border-t border-gray-300 font-bold text-black">
            <span>Profit</span><span className="font-mono">${netProfit.toFixed(2)}</span>
          </div>
        </div>
      </aside>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete invoice"
        actions={
          <>
            <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
            <button onClick={doDelete} disabled={busy} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {busy ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <p>Permanently delete invoice <strong className="text-black">{invoice.number}</strong>?</p>
      </Modal>

      <Modal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        title={placeholder ?? ""}
        actions={
          <button
            onClick={() => setPlaceholder(null)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            OK
          </button>
        }
      >
        <p>
          <strong className="text-black">{placeholder}</strong> is coming soon. This will let
          you pick from a list of saved templates and add them to this invoice with one click.
        </p>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-800">
      <span>{label}</span><span className="font-mono">{value}</span>
    </div>
  );
}

function LineTable({
  title, kind, lines, allLines, approved, declined,
  onGroupApprove, onToggleLineGroup, onUpdate, onMove, onRemove, onAdd,
}: {
  title: string;
  kind: "PART" | "LABOR";
  lines: Line[];
  allLines: Line[];
  approved: boolean;
  declined: boolean;
  onGroupApprove: (approved: boolean) => void;
  onToggleLineGroup: (line: Line) => void;
  onUpdate: <K extends keyof Line>(idx: number, key: K, value: Line[K]) => void;
  onMove: (idx: number, dir: "up" | "down") => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
}) {
  function realIdx(line: Line) { return allLines.indexOf(line); }
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const isLabor = kind === "LABOR";

  function StatusPill({ line }: { line: Line }) {
    const g = (line.group ?? "").trim();
    const tip = g
      ? `Toggle all "${g}" rows (parts + labor)`
      : "Toggle this row only (no group set)";
    return (
      <button
        onClick={() => onToggleLineGroup(line)}
        title={tip}
        className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${
          line.approved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {line.approved ? "Approved" : "Declined"}
      </button>
    );
  }

  return (
    <section className="bg-white border border-gray-300 rounded">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-black">{title}</h2>
          <div className="no-print inline-flex rounded border border-gray-300 overflow-hidden text-xs">
            <button
              onClick={() => onGroupApprove(true)}
              className={`px-3 py-1 font-medium ${approved ? "bg-green-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
            >
              Approve all
            </button>
            <button
              onClick={() => onGroupApprove(false)}
              className={`px-3 py-1 font-medium border-l border-gray-300 ${declined ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
            >
              Disapprove all
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-700 font-mono">${total.toFixed(2)}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-700 uppercase tracking-wide border-b border-gray-200 bg-gray-50">
              <th className="px-1 py-2 w-6 no-print"></th>
              <th className="px-1 py-2 w-6"></th>
              <th className="px-2 py-2 w-20">Status</th>
              <th className="px-2 py-2">{isLabor ? "Labor Type" : "Description"}</th>
              {isLabor ? (
                <>
                  <th className="px-2 py-2 w-24">Hours</th>
                  <th className="px-2 py-2 w-24">Rate</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2 w-20">Cost</th>
                  <th className="px-2 py-2 w-20">Price</th>
                  <th className="px-2 py-2 w-16">Qty</th>
                  <th className="px-2 py-2 w-20">Unit</th>
                </>
              )}
              <th className="px-2 py-2 w-16 text-center">Taxable</th>
              <th className="px-2 py-2 w-24 text-right">Amount</th>
              <th className="px-2 py-2 w-20">Group</th>
              <th className="px-2 py-2 w-8 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, posInKind) => {
              const i = realIdx(l);
              const canUp = posInKind > 0;
              const canDown = posInKind < lines.length - 1;
              return (
                <tr key={i} className={`border-b border-gray-100 ${l._dirty ? "bg-red-50" : ""}`}>
                  <td className="px-1 py-1 text-center no-print">
                    <div className="flex flex-col items-center leading-none">
                      <button
                        onClick={() => onMove(i, "up")}
                        disabled={!canUp}
                        title="Move up"
                        className={`text-gray-600 hover:text-black text-[10px] ${!canUp ? "opacity-20 cursor-not-allowed" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onMove(i, "down")}
                        disabled={!canDown}
                        title="Move down"
                        className={`text-gray-600 hover:text-black text-[10px] ${!canDown ? "opacity-20 cursor-not-allowed" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-1 text-center">
                    {l._dirty && <span title="Unsaved" className="inline-block w-2 h-2 rounded-full bg-red-500" />}
                  </td>
                  <td className="px-2 py-1">
                    <StatusPill line={l} />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={l.description}
                      onChange={(e) => onUpdate(i, "description", e.target.value)}
                      placeholder={isLabor ? "Job / operation" : "New part"}
                      className="w-full bg-transparent text-black outline-none"
                    />
                  </td>
                  {isLabor ? (
                    <>
                      <td className="px-2 py-1">
                        <input type="text" inputMode="decimal" value={l.qty}
                          onChange={(e) => onUpdate(i, "qty",   Number(stripLeadingZeros(e.target.value)) || 0)}
                          className="w-full bg-transparent text-black outline-none text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" inputMode="decimal" value={l.price}
                          onChange={(e) => onUpdate(i, "price", Number(stripLeadingZeros(e.target.value)) || 0)}
                          className="w-full bg-transparent text-black outline-none text-right font-mono"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1">
                        <input type="text" inputMode="decimal" value={l.cost}
                          onChange={(e) => onUpdate(i, "cost",  Number(stripLeadingZeros(e.target.value)) || 0)}
                          className="w-full bg-transparent text-black outline-none text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" inputMode="decimal" value={l.price}
                          onChange={(e) => onUpdate(i, "price", Number(stripLeadingZeros(e.target.value)) || 0)}
                          className="w-full bg-transparent text-black outline-none text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" inputMode="decimal" value={l.qty}
                          onChange={(e) => onUpdate(i, "qty",   Number(stripLeadingZeros(e.target.value)) || 0)}
                          className="w-full bg-transparent text-black outline-none text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input value={l.unit ?? ""}
                          onChange={(e) => onUpdate(i, "unit", e.target.value)}
                          className="w-full bg-transparent text-black outline-none"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1 text-center">
                    <input type="checkbox" checked={l.taxable}
                      onChange={(e) => onUpdate(i, "taxable", e.target.checked)}
                      className="accent-blue-600"
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-black">${l.amount.toFixed(2)}</td>
                  <td className="px-2 py-1">
                    <input
                      value={l.group ?? ""}
                      onChange={(e) => onUpdate(i, "group", e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-gray-800 outline-none text-xs"
                    />
                  </td>
                  <td className="px-2 py-1 text-right no-print">
                    <button onClick={() => onRemove(i)} title="Delete" className="text-red-600 hover:text-red-800 font-bold">×</button>
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr><td colSpan={isLabor ? 10 : 12} className="px-2 py-4 text-center text-gray-600">No {title.toLowerCase()} yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="no-print px-4 py-3 border-t border-gray-200 flex justify-end">
        <button onClick={onAdd} className="text-sm text-blue-700 hover:text-blue-900 font-medium">+ Add {title.slice(0, -1)}</button>
      </div>
    </section>
  );
}