"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Client = { id: string; name: string };

export default function ClientPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = useMemo(
    () => clients.filter((c) => selectedIds.includes(c.id)),
    [clients, selectedIds]
  );

  // Only return results when the user has typed something, cap at 5
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return clients
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 5);
  }, [clients, q]);

  function add(id: string) {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
    setQ("");
    setOpen(false);
    // Keep cursor in the input so the user can keep typing
    inputRef.current?.focus();
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chips + search input */}
      <div
        className="min-h-[44px] border border-gray-400 rounded bg-white p-1.5 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-xs px-2 py-1 rounded"
          >
            {c.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(c.id);
              }}
              className="text-blue-700 hover:text-blue-900 font-bold leading-none"
              aria-label={`Remove ${c.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => {
            // Only open if there's already a search term
            if (q.trim().length > 0) setOpen(true);
          }}
          placeholder={selected.length === 0 ? "Type to search clients…" : ""}
          className="flex-1 min-w-[140px] text-sm text-black placeholder:text-gray-600 outline-none py-1"
        />
      </div>

      {/* Dropdown — only renders when the user is typing and there's a term */}
      {open && q.trim().length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-400 rounded shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-gray-700">No matches for "{q}".</p>
          ) : (
            filtered.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => (isSelected ? remove(c.id) : add(c.id))}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="text-black">{c.name}</span>
                  {isSelected && (
                    <span className="text-blue-700 text-xs font-semibold">
                      Selected
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}