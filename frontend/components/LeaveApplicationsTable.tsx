"use client";

import { useState } from "react";
import { LeaveApplication } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import LeaveDetailPanel from "@/components/LeaveDetailPanel";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";

const TYPE_ACCENT: Record<string, string> = {
  CL: "#2e6fe8",
  SL: "#e0a930",
  OL: "#0f9d58",
  WFH: "#d33a6a",
  OD: "#7c3aed",
  LOP: "#c4271e",
};

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  if (start === end) return <span>{fmt(start)}</span>;
  return (
    <span className="leading-tight">
      {fmt(start)}
      <br />
      <span className="text-muted">to</span> {fmt(end)}
    </span>
  );
}

export default function LeaveApplicationsTable({
  applications,
  nameByCode,
  applicantName,
  applicantPictureUrl,
}: {
  applications: LeaveApplication[];
  nameByCode: Record<string, string>;
  applicantName: string;
  applicantPictureUrl: string | null;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <table className="w-full data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Leave Type</th>
            <th>Count</th>
            <th>Reason</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="cursor-pointer" onClick={() => setSelectedId(app.id)}>
              <td className="text-brand font-medium">{formatDateRange(app.start_date, app.end_date)}</td>
              <td>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3.5 w-1 rounded-full shrink-0"
                    style={{ backgroundColor: TYPE_ACCENT[app.leave_type_code || ""] || "#67707c" }}
                  />
                  {nameByCode[app.leave_type_code || ""] || app.leave_type_code}
                </span>
              </td>
              <td className="tabular-nums">{app.total_deducted_days} Day(s)</td>
              <td className="text-muted max-w-[220px] truncate">{app.reason || "—"}</td>
              <td>
                <StatusBadge status={app.is_lop ? "LOP_CONVERTED" : app.status} />
              </td>
              <td>
                {app.status === "APPROVED" && (
                  <a
                    href={buildGoogleCalendarUrl({
                      title: `${app.leave_type_code || "Leave"} - Out of office`,
                      startDate: app.start_date,
                      endDate: app.end_date,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted text-xs font-medium hover:text-brand"
                  >
                    + Calendar
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <LeaveDetailPanel
        applicationId={selectedId}
        onClose={() => setSelectedId(null)}
        applicantName={applicantName}
        applicantPictureUrl={applicantPictureUrl}
      />
    </>
  );
}
