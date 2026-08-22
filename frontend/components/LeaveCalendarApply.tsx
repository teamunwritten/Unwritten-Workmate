"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createApplication } from "@/lib/api/leave";
import { LeaveApplication, LeaveType, RequestKind, SessionType, ValidationErrorResponse } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-warning",
  APPROVED: "bg-success",
  REJECTED: "bg-danger",
  BLOCKED: "bg-danger",
  CANCELLED: "bg-muted",
};

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoRange(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const [a, b] = startIso <= endIso ? [startIso, endIso] : [endIso, startIso];
  const cur = new Date(a + "T00:00:00");
  const end = new Date(b + "T00:00:00");
  while (cur <= end) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

interface BookedDay {
  status: string;
  leaveTypeCode: string | null;
}

export default function LeaveCalendarApply({
  leaveTypes,
  applications,
}: {
  leaveTypes: LeaveType[];
  applications: LeaveApplication[];
}) {
  const router = useRouter();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [requestKind, setRequestKind] = useState<RequestKind>("LEAVE");
  const [leaveTypeId, setLeaveTypeId] = useState<number | "">("");
  const [session, setSession] = useState<SessionType>("FULL_DAY");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState<ValidationErrorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    function onMouseUp() {
      setIsDragging(false);
      setDragAnchor(null);
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  // Open the popup once a drag (or single click) finishes -- opening it mid-drag would put an
  // overlay over the calendar and block the mouseenter events a range-drag depends on.
  useEffect(() => {
    if (!isDragging && selected.size > 0) {
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const bookedByDate = useMemo(() => {
    const map = new Map<string, BookedDay>();
    for (const app of applications) {
      if (app.status === "CANCELLED") continue;
      for (const iso of isoRange(app.start_date, app.end_date)) {
        map.set(iso, { status: app.is_lop ? "LOP_CONVERTED" : app.status, leaveTypeCode: app.leave_type_code });
      }
    }
    return map;
  }, [applications]);

  const relevantTypes = leaveTypes.filter((lt) =>
    requestKind === "LEAVE" ? !["WFH", "OD"].includes(lt.code) : requestKind === lt.code
  );

  useEffect(() => {
    if (relevantTypes.length > 0 && !relevantTypes.some((t) => t.id === leaveTypeId)) {
      setLeaveTypeId(relevantTypes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKind, leaveTypes]);

  function handleMouseDown(iso: string) {
    setIsDragging(true);
    setDragAnchor(iso);
    setSelected(new Set([iso]));
    setViolations(null);
    setSuccess(false);
  }

  function handleMouseEnter(iso: string) {
    if (!isDragging || !dragAnchor) return;
    setSelected(new Set(isoRange(dragAnchor, iso)));
  }

  function clearSelection() {
    setSelected(new Set());
    setViolations(null);
    setSuccess(false);
    setModalOpen(false);
  }

  function goToMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const sortedSelected = Array.from(selected).sort();
  const isSingleDay = sortedSelected.length === 1;

  async function handleSubmit() {
    if (!leaveTypeId || sortedSelected.length === 0) return;
    setError(null);
    setViolations(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await createApplication({
        leave_type_id: Number(leaveTypeId),
        request_kind: requestKind,
        sessions: sortedSelected.map((date) => ({
          date,
          session: isSingleDay ? session : "FULL_DAY",
        })),
        reason: reason || undefined,
      });
      setSuccess(true);
      setReason("");
      router.refresh();
      setTimeout(() => {
        setSelected(new Set());
        setSuccess(false);
        setModalOpen(false);
      }, 900);
    } catch (err: any) {
      if (err.status === 422 && err.body?.detail) {
        setViolations(err.body.detail as ValidationErrorResponse);
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Build calendar grid: leading blanks aligned to weekday, then the days of the month.
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = toISODate(today);

  return (
    <div className="select-none">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs px-2 py-1" onClick={() => goToMonth(-1)}>
              ‹
            </button>
            <div className="text-sm font-semibold w-40 text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button className="btn-secondary text-xs px-2 py-1" onClick={() => goToMonth(1)}>
              ›
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand" /> Selected
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning" /> Pending
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" /> Approved
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-xs text-muted mb-1.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} />;
            const iso = toISODate(new Date(viewYear, viewMonth, day));
            const isSelected = selected.has(iso);
            const booked = bookedByDate.get(iso);
            const isToday = iso === todayIso;

            return (
              <button
                type="button"
                key={idx}
                onMouseDown={() => handleMouseDown(iso)}
                onMouseEnter={() => handleMouseEnter(iso)}
                className={`min-h-[64px] rounded-md border px-2 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-brand text-white border-brand"
                    : isToday
                    ? "border-brand text-ink bg-brand-soft/40"
                    : "border-border text-ink hover:bg-canvas"
                }`}
              >
                <div className="font-medium">{day}</div>
                {booked && !isSelected && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[booked.status] || "bg-muted"}`} />
                    <span className="text-[10px] text-muted truncate">{booked.leaveTypeCode}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-3">Click a date to apply for one day, or click and drag across dates for a bulk request.</p>
      </div>

      {modalOpen && sortedSelected.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={clearSelection}>
          <div className="card w-full max-w-md p-5 space-y-4 animate-[fadeIn_0.15s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold mb-0.5">New request</div>
                <div className="text-xs text-muted">
                  {sortedSelected.length === 1
                    ? new Date(sortedSelected[0] + "T00:00:00").toDateString()
                    : `${new Date(sortedSelected[0] + "T00:00:00").toDateString()} → ${new Date(
                        sortedSelected[sortedSelected.length - 1] + "T00:00:00"
                      ).toDateString()} · ${sortedSelected.length} day(s)`}
                </div>
              </div>
              <button onClick={clearSelection} type="button" className="text-muted hover:text-ink text-lg leading-none">
                ×
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Request type</label>
              <div className="flex gap-2">
                {(["LEAVE", "WFH"] as RequestKind[]).map((kind) => (
                  <button
                    type="button"
                    key={kind}
                    onClick={() => setRequestKind(kind)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                      requestKind === kind ? "bg-brand-soft text-brand border-brand" : "border-border text-ink"
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Leave type</label>
              <select className="input" value={leaveTypeId} onChange={(e) => setLeaveTypeId(Number(e.target.value))}>
                {relevantTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code})
                  </option>
                ))}
              </select>
            </div>

            {isSingleDay && (
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Session</label>
                <select className="input" value={session} onChange={(e) => setSession(e.target.value as SessionType)}>
                  <option value="FULL_DAY">Full Day</option>
                  <option value="FIRST_HALF">First Half</option>
                  <option value="SECOND_HALF">Second Half</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Reason (optional)</label>
              <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            {error && <div className="text-sm text-danger">{error}</div>}
            {success && <div className="text-sm text-success">Application submitted successfully.</div>}

            {violations && (
              <div className="rounded-md border border-danger/30 bg-danger/5 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-danger">
                  {violations.outcome === "BLOCK" ? "Request blocked" : "Review required"}
                </div>
                <ul className="space-y-1">
                  {violations.violations.map((v, i) => (
                    <li key={i} className="text-xs text-danger">
                      {v.message || v.reason_code}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={submitting || !leaveTypeId} className="btn-primary flex-1">
                {submitting ? "Submitting..." : "Submit request"}
              </button>
              <button onClick={clearSelection} className="btn-secondary" type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
