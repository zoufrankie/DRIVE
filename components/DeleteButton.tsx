"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  itemName,
  endpoint,
  redirectTo,
  blocked,
}: {
  itemName: string;
  endpoint: string;
  redirectTo: string;
  blocked?: { reason: string };
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setDeleting(false);
      alert("Failed to delete. Check the console for details.");
    }
  }

  if (blocked) {
    return (
      <button
        disabled
        title={blocked.reason}
        className="bg-gray-100 text-gray-400 px-4 py-2 rounded text-sm cursor-not-allowed"
      >
        Delete
      </button>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="bg-white text-red-600 border border-red-300 px-4 py-2 rounded text-sm hover:bg-red-50"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded px-3 py-1.5">
      <span className="text-red-900 font-medium">Delete {itemName}?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-red-700 hover:text-red-900 text-xs"
      >
        Cancel
      </button>
    </div>
  );
}