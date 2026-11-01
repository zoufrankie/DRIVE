"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Option = { id: string; label: string; sublabel?: string };

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Type to search…",
  emptyText = "No matches",
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.id === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options.slice(0, 8);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(term) ||
          (o.sublabel?.toLowerCase().includes(term) ?? false)
      )
      .slice(0, 8);
  }, [options, q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(id: string) {
    onChange(id);
    setQ("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function clear() {
    onChange("");
    setQ("");
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-[42px] border border-gray-400 rounded bg-white p-1.5 flex items-center gap-2 cursor-text focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selected && (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-xs px-2 py-1 rounded whitespace-nowrap">
            {selected.label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="text-blue-700 hover:text-blue-900 font-bold leading-none"
            >
              ×
            </button>
          </span>
        )}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected ? "" : placeholder}
          className="flex-1 min-w-[100px] text-sm text-black placeholder:text-gray-600 outline-none py-1"
        />
      </div>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-400 rounded shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-gray-700">{emptyText}</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  value === o.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="text-black">{o.label}</div>
                {o.sublabel && (
                  <div className="text-xs text-gray-600">{o.sublabel}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}