"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";

const HOW_FOUND_OPTIONS = [
  "Google",
  "Facebook",
  "Instagram",
  "Referral",
  "Walk-in",
  "Returning customer",
  "Other",
];

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  howFoundUs: "",
  howFoundUsOther: "",
  notes: "",
};

export default function NewClientPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dupName, setDupName] = useState<string | null>(null);
  const router = useRouter();

  // Reset everything on mount — guards against Next.js preserving state
  useEffect(() => {
    setForm(INITIAL_FORM);
    setError("");
    setDupName(null);
    setSaving(false);
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function finalHowFoundUs() {
    return form.howFoundUs === "Other"
      ? form.howFoundUsOther.trim()
      : form.howFoundUs.trim();
  }

  function handleCancel() {
    setForm(INITIAL_FORM);
    setError("");
    setDupName(null);
    router.push("/clients");
  }

  async function doSave() {
    setSaving(true);
    setError("");
    const payload = { ...form, howFoundUs: finalHowFoundUs() };
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Something went wrong while saving.");
      return;
    }
    const client = await res.json();
    router.push(`/clients/${client.id}`);
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    try {
      const existing = await fetch("/api/clients", { cache: "no-store" }).then(
        (r) => r.json()
      );
      if (Array.isArray(existing)) {
        const match = existing.find(
          (c: { name: string }) =>
            c.name.toLowerCase().trim() === form.name.toLowerCase().trim()
        );
        if (match) {
          setSaving(false);
          setDupName(match.name);
          return;
        }
      }
    } catch {
      // If lookup fails, fall through and save
    }

    await doSave();
  }

  return (
    <div className="p-8 w-full">
      <Link href="/clients" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to Clients
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-6 text-black">New Client</h1>

      <form
        onSubmit={submit}
        autoComplete="off"
        className="bg-white p-6 rounded shadow-sm border border-gray-300 space-y-5"
      >
        {error && (
          <p className="text-red-700 text-sm bg-red-50 border border-red-300 rounded p-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-black">
              Street
            </label>
            <input
              value={form.street}
              onChange={(e) => update("street", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              City
            </label>
            <input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                State
              </label>
              <input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                maxLength={2}
                className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                ZIP
              </label>
              <input
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              How they found us
            </label>
            <select
              value={form.howFoundUs}
              onChange={(e) => update("howFoundUs", e.target.value)}
              className="w-full border border-gray-400 p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {HOW_FOUND_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          {form.howFoundUs === "Other" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 text-black">
                Please specify
              </label>
              <input
                value={form.howFoundUsOther}
                onChange={(e) => update("howFoundUsOther", e.target.value)}
                placeholder="Tell us how they found you"
                className="w-full border border-gray-400 p-2 rounded text-black placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">
            Notes
          </label>
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
            {saving ? "Saving…" : "Save Client"}
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
        open={dupName !== null}
        onClose={() => setDupName(null)}
        title="Duplicate client name"
        actions={
          <>
            <button
              onClick={() => setDupName(null)}
              className="px-4 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setDupName(null);
                doSave();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
            >
              Add anyway
            </button>
          </>
        }
      >
        <p>
          A client named{" "}
          <strong className="text-black">&quot;{dupName}&quot;</strong> already
          exists.
        </p>
        <p className="mt-2 text-gray-700">
          Add another client with this same name?
        </p>
      </Modal>
    </div>
  );
}