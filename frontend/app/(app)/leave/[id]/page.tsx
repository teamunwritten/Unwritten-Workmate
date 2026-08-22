import { notFound } from "next/navigation";
import { backendFetch } from "@/lib/session";
import { LeaveApplication } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import CancelButton from "@/components/CancelButton";
import AddToCalendarBanner from "@/components/AddToCalendarBanner";

async function getApplication(id: string): Promise<LeaveApplication | null> {
  const res = await backendFetch(`/leave/applications/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export default async function LeaveDetailPage({ params }: { params: { id: string } }) {
  const app = await getApplication(params.id);
  if (!app) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const isFuture = app.start_date >= today;
  const canCancel = (app.status === "PENDING" || app.status === "APPROVED") && isFuture;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">
            {app.leave_type_code} · {app.start_date} → {app.end_date}
          </h1>
          <StatusBadge status={app.is_lop ? "LOP_CONVERTED" : app.status} />
        </div>
        {canCancel && <CancelButton applicationId={app.id} />}
      </div>

      {app.status === "APPROVED" && (
        <AddToCalendarBanner leaveTypeCode={app.leave_type_code} startDate={app.start_date} endDate={app.end_date} />
      )}

      <dl className="card divide-y divide-border">
        <Row label="Applied days" value={String(app.applied_days)} />
        <Row label="Sandwich days added" value={String(app.sandwich_days_added)} />
        <Row label="Total deducted" value={String(app.total_deducted_days)} />
        <Row label="Loss of pay" value={app.is_lop ? "Yes" : "No"} />
        <Row label="Reason" value={app.reason || "—"} />
        <Row label="Applied at" value={new Date(app.applied_at).toLocaleString()} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-5 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
