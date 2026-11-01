"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    shopName: "",
    defaultTaxRate: "10",
    defaultLaborRate: "100",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setForm({
          shopName: s.shopName ?? "",
          defaultTaxRate: String(s.defaultTaxRate ?? 10),
          defaultLaborRate: String(s.defaultLaborRate ?? 100),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: form.shopName,
        defaultTaxRate: Number(form.defaultTaxRate) || 0,
        defaultLaborRate: Number(form.defaultLaborRate) || 0,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  if (loading) return <div className="p-8 text-gray-700 text-sm">Loading...</div>;

  return (
    <div className="p-8 w-full max-w-2xl">
      <h1 className="text-3xl font-bold text-black mb-6">Settings</h1>
      <form
        onSubmit={save}
        className="bg-white p-6 rounded shadow-sm border border-gray-300 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium mb-1 text-black">
            Shop name
          </label>
          <input
            value={form.shopName}
            onChange={(e) => update("shopName", e.target.value)}
            placeholder="Your shop"
            className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Default tax rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.defaultTaxRate}
              onChange={(e) => update("defaultTaxRate", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Default labor rate ($/hr)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.defaultLaborRate}
              onChange={(e) => update("defaultLaborRate", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && <span className="text-green-700 text-sm">Saved</span>}
        </div>
      </form>
    </div>
  );
}