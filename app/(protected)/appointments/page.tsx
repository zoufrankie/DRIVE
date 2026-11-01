"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";

type Appointment = {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
  title: string;
  description: string | null;
};

type Draft = {
  id: string | null;
  date: string;
  startMinute: number;
  endMinute: number;
  title: string;
  description: string;
};

type DragPos = { date: string; minute: number };

const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 24;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function parseLocal(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayLocal(): string {
  return toYMD(new Date());
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocal(dateStr);
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

function getMonday(dateStr: string): string {
  const d = parseLocal(dateStr);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toYMD(d);
}

function formatWeekRange(monday: string): string {
  const end = addDays(monday, 6);
  const m = parseLocal(monday);
  const e = parseLocal(end);
  if (m.getMonth() === e.getMonth()) {
    return `${m.toLocaleDateString(undefined, { month: "long" })} ${m.getDate()} – ${e.getDate()}, ${m.getFullYear()}`;
  }
  return `${m.toLocaleDateString(undefined, { month: "short" })} ${m.getDate()} – ${e.toLocaleDateString(undefined, { month: "short" })} ${e.getDate()}, ${e.getFullYear()}`;
}

export default function AppointmentsPage() {
  const [anchorDate, setAnchorDate] = useState(todayLocal());
  const [openingHour, setOpeningHour] = useState(8);
  const [closingHour, setClosingHour] = useState(18);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragStart, setDragStart] = useState<DragPos | null>(null);
  const [dragCurrent, setDragCurrent] = useState<DragPos | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const dragStartRef = useRef<DragPos | null>(null);
  const dragCurrentRef = useRef<DragPos | null>(null);

  useEffect(() => { dragStartRef.current = dragStart; }, [dragStart]);
  useEffect(() => { dragCurrentRef.current = dragCurrent; }, [dragCurrent]);

  const weekStart = getMonday(anchorDate);
  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const today = todayLocal();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s?.openingHour != null) setOpeningHour(Number(s.openingHour));
        if (s?.closingHour != null) setClosingHour(Number(s.closingHour));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const from = week[0];
    const to = week[6];
    fetch(`/api/appointments?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch((e) => setError(`Load failed (${e})`))
      .finally(() => setLoading(false));
  }, [week, refreshKey]);

  useEffect(() => {
    const up = () => {
      const s = dragStartRef.current;
      const c = dragCurrentRef.current;
      if (s && c && s.date === c.date) {
        const lo = Math.min(s.minute, c.minute);
        const hi = Math.max(s.minute, c.minute);
        setDraft({
          id: null,
          date: s.date,
          startMinute: lo,
          endMinute: hi + SLOT_MINUTES,
          title: "",
          description: "",
        });
      }
      setDragStart(null);
      setDragCurrent(null);
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const openingMinute = openingHour * 60;
  const closingMinute = closingHour * 60;

  const slots = useMemo(() => {
    const arr: number[] = [];
    for (let m = openingMinute; m < closingMinute; m += SLOT_MINUTES) {
      arr.push(m);
    }
    return arr;
  }, [openingMinute, closingMinute]);

  function isInDrag(date: string, minute: number): boolean {
    if (!dragStart || !dragCurrent) return false;
    if (dragStart.date !== date || dragCurrent.date !== date) return false;
    const lo = Math.min(dragStart.minute, dragCurrent.minute);
    const hi = Math.max(dragStart.minute, dragCurrent.minute);
    return minute >= lo && minute <= hi;
  }

  async function saveDraft(d: Draft) {
    if (!d.title.trim()) return;
    setBusy(true);
    const payload = {
      date: d.date,
      startMinute: d.startMinute,
      endMinute: d.endMinute,
      title: d.title,
      description: d.description,
    };
    try {
      if (d.id) {
        await fetch(`/api/appointments/${d.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDraft(null);
      setRefreshKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      setDraft(null);
      setRefreshKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-black">Appointments</h1>
          <p className="text-gray-700 mt-1">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchorDate(addDays(anchorDate, -7))}
            className="bg-gray-200 text-gray-900 px-3 py-2 rounded text-sm hover:bg-gray-300"
          >
            ← Prev Week
          </button>
          <button
            onClick={() => setAnchorDate(todayLocal())}
            className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            This Week
          </button>
          <button
            onClick={() => setAnchorDate(addDays(anchorDate, 7))}
            className="bg-gray-200 text-gray-900 px-3 py-2 rounded text-sm hover:bg-gray-300"
          >
            Next Week →
          </button>
          <input
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className="border border-gray-400 bg-white text-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="text-xs text-gray-600 mb-3">
        Drag within a day to create · click a slot for 15 min · hours {formatTime(openingMinute)} – {formatTime(closingMinute)} (edit in Settings)
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-300 rounded overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-gray-300 bg-gray-50">
            <div />
            {week.map((date, i) => {
              const d = parseLocal(date);
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className={`text-center py-2 text-sm border-l border-gray-200 ${
                    isToday ? "bg-blue-100 text-blue-900 font-semibold" : "text-gray-900"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wide text-gray-600">{DAY_LABELS[i]}</div>
                  <div className="text-base">{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          <div className="relative" style={{ height: slots.length * SLOT_HEIGHT }}>
            <div className="grid grid-cols-[70px_repeat(7,1fr)]">
              {slots.map((slot) => {
                const isHour = slot % 60 === 0;
                const label = formatTime(slot);
                return (
                  <Fragment key={slot}>
                    <div
                      className={`flex items-start justify-end pr-2 text-xs ${
                        isHour ? "text-gray-700 font-medium" : "text-gray-400"
                      }`}
                      style={{ height: SLOT_HEIGHT }}
                    >
                      {isHour ? label : ""}
                    </div>
                    {week.map((date) => (
                      <div
                        key={`c-${slot}-${date}`}
                        className={`cursor-pointer select-none border-l border-gray-200 ${
                          isInDrag(date, slot) ? "bg-blue-100" : "hover:bg-gray-50"
                        } ${isHour ? "border-t-2 border-gray-300" : "border-t border-gray-100"}`}
                        style={{ height: SLOT_HEIGHT }}
                        onMouseDown={() => {
                          const pos = { date, minute: slot };
                          setDragStart(pos);
                          setDragCurrent(pos);
                        }}
                        onMouseEnter={() => {
                          const s = dragStartRef.current;
                          if (s && s.date === date) {
                            setDragCurrent({ date, minute: slot });
                          }
                        }}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </div>

            <div className="absolute top-0 left-[70px] right-0 bottom-0 pointer-events-none">
              {appointments.map((apt) => {
                const dayIdx = week.indexOf(apt.date);
                if (dayIdx < 0) return null;
                const top =
                  ((apt.startMinute - openingMinute) / SLOT_MINUTES) * SLOT_HEIGHT;
                const height =
                  ((apt.endMinute - apt.startMinute) / SLOT_MINUTES) * SLOT_HEIGHT;
                if (top < 0 || height <= 0) return null;
                return (
                  <div
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraft({
                        id: apt.id,
                        date: apt.date,
                        startMinute: apt.startMinute,
                        endMinute: apt.endMinute,
                        title: apt.title,
                        description: apt.description ?? "",
                      });
                    }}
                    className="absolute bg-blue-500 hover:bg-blue-600 text-white rounded px-1.5 py-0.5 text-xs cursor-pointer pointer-events-auto overflow-hidden shadow-sm"
                    style={{
                      top: top + 1,
                      height: Math.max(height - 2, 16),
                      left: `calc(${dayIdx * 100}% / 7 + 2px)`,
                      width: `calc(100% / 7 - 4px)`,
                    }}
                    title={`${apt.title} — ${formatTime(apt.startMinute)} to ${formatTime(apt.endMinute)}`}
                  >
                    <div className="font-medium truncate leading-tight">{apt.title}</div>
                    {height >= 40 && (
                      <div className="text-[10px] opacity-80 truncate leading-tight">
                        {formatTime(apt.startMinute)} – {formatTime(apt.endMinute)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {appointments.length === 0 && !loading && (
        <p className="text-gray-700 text-sm mt-4">
          No appointments this week. Drag on the calendar to add one.
        </p>
      )}

      <AppointmentModal
        draft={draft}
        openingMinute={openingMinute}
        closingMinute={closingMinute}
        onClose={() => setDraft(null)}
        onSave={saveDraft}
        onDelete={deleteDraft}
        busy={busy}
      />
    </div>
  );
}

function AppointmentModal({
  draft,
  openingMinute,
  closingMinute,
  onClose,
  onSave,
  onDelete,
  busy,
}: {
  draft: Draft | null;
  openingMinute: number;
  closingMinute: number;
  onClose: () => void;
  onSave: (d: Draft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startMinute, setStartMinute] = useState(0);
  const [endMinute, setEndMinute] = useState(0);

  useEffect(() => {
    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description);
      setStartMinute(draft.startMinute);
      setEndMinute(draft.endMinute);
    }
  }, [draft]);

  if (!draft) return null;

  const options: number[] = [];
  for (let m = openingMinute; m <= closingMinute; m += SLOT_MINUTES) {
    options.push(m);
  }

  const dayLabel = parseLocal(draft.date).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={draft.id ? "Edit Appointment" : "New Appointment"}
      actions={
        <>
          {draft.id && (
            <button
              onClick={() => onDelete(draft.id!)}
              disabled={busy}
              className="bg-white text-red-600 border border-red-300 px-4 py-2 rounded text-sm hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                id: draft.id,
                date: draft.date,
                title,
                description,
                startMinute,
                endMinute,
              })
            }
            disabled={busy || !title.trim() || endMinute <= startMinute}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-sm text-gray-700">{dayLabel}</div>
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Oil change — 2018 Honda Civic"
            autoFocus
            className="w-full border border-gray-400 p-2 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <select
              value={startMinute}
              onChange={(e) => {
                const s = Number(e.target.value);
                setStartMinute(s);
                if (endMinute <= s) setEndMinute(Math.min(s + 30, closingMinute));
              }}
              className="w-full border border-gray-400 p-2 rounded bg-white text-black"
            >
              {options.map((m) => (
                <option key={m} value={m}>{formatTime(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <select
              value={endMinute}
              onChange={(e) => setEndMinute(Number(e.target.value))}
              className="w-full border border-gray-400 p-2 rounded bg-white text-black"
            >
              {options
                .filter((m) => m > startMinute)
                .map((m) => (
                  <option key={m} value={m}>{formatTime(m)}</option>
                ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-400 p-2 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
}