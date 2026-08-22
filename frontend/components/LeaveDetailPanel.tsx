"use client";

import { useEffect, useState } from "react";
import { getApplication } from "@/lib/api/leave";
import { LeaveApplication } from "@/lib/types";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import CancelButton from "@/components/CancelButton";
import Icon from "@/components/Icon";

function formatDateRange(start: string, end: string) {
  return start === end ? start : `${start} → ${end}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function FlowNode({
  name,
  pictureUrl,
  label,
  sublabel,
  dim,
}: {
  name: string;
  pictureUrl?: string | null;
  label: string;
  sublabel?: string;
  dim?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 w-24 shrink-0 text-center ${dim ? "opacity-50" : ""}`}>
      <Avatar name={name} size={40} pictureUrl={pictureUrl} />
      <div className="min-w-0 w-full">
        <div className="text-[11.5px] font-semibold text-ink truncate">{name}</div>
        <div className="text-[10.5px] text-muted truncate">{label}</div>
        {sublabel && <div className="text-[9.5px] text-muted/70 truncate">{sublabel}</div>}
      </div>
    </div>
  );
}

function FlowConnector({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <div className="relative flex-1 h-0.5 bg-success mx-1 mb-8">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-success flex items-center justify-center">
          <Icon name="approvals" className="h-3 w-3 text-white" />
        </div>
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <div className="relative flex-1 h-0.5 bg-danger mx-1 mb-8">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-danger flex items-center justify-center text-white text-[11px] font-bold leading-none">
          ✕
        </div>
      </div>
    );
  }
  if (status === "CANCELLED") {
    return (
      <div className="relative flex-1 h-0.5 border-t-2 border-dashed border-border mx-1 mb-8">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-canvas border border-border flex items-center justify-center text-muted text-[10px] font-bold leading-none">
          ✕
        </div>
      </div>
    );
  }
  // PENDING -- animated dot travelling from applicant to manager, "en route for review".
  return (
    <div className="relative flex-1 h-0.5 bg-border mx-1 mb-8 overflow-visible">
      <div className="absolute inset-0 bg-warning/30" />
      <div className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-warning shadow-[0_0_0_3px_rgba(176,106,0,0.15)] animate-[flowDot_1.8s_ease-in-out_infinite]" />
    </div>
  );
}

export default function LeaveDetailPanel({
  applicationId,
  onClose,
  applicantName,
  applicantPictureUrl,
}: {
  applicationId: number | null;
  onClose: () => void;
  applicantName: string;
  applicantPictureUrl?: string | null;
}) {
  const [app, setApp] = useState<LeaveApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const open = applicationId !== null;

  useEffect(() => {
    if (applicationId == null) return;
    setLoading(true);
    setApp(null);
    getApplication(applicationId)
      .then(setApp)
      .finally(() => setLoading(false));
  }, [applicationId]);

  function refetch() {
    if (applicationId == null) return;
    getApplication(applicationId).then(setApp);
  }

  const today = new Date().toISOString().slice(0, 10);
  const canCancel = app && (app.status === "PENDING" || app.status === "APPROVED") && app.start_date >= today;
  const flowStatus = app?.status === "PENDING" ? "PENDING" : app?.status || "PENDING";
  const managerLabel =
    flowStatus === "APPROVED" ? "Approved" : flowStatus === "REJECTED" ? "Rejected" : flowStatus === "CANCELLED" ? "—" : "Reviewing";
  const lastAction = app?.approval_history && app.approval_history.length > 0 ? app.approval_history[app.approval_history.length - 1] : null;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-40 h-full w-[420px] max-w-full bg-surface border-l border-border shadow-xl transition-transform duration-200 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-5">
          <h2 className="text-sm font-semibold">Leave request</h2>
          <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-muted hover:bg-canvas">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading || !app ? (
            <div className="text-sm text-muted text-center py-16">Loading...</div>
          ) : (
            <>
              <div>
                <h3 className="text-base font-semibold">{app.leave_type_code}</h3>
                <div className="text-sm text-muted mt-0.5">{formatDateRange(app.start_date, app.end_date)}</div>
                <div className="mt-2">
                  <StatusBadge status={app.is_lop ? "LOP_CONVERTED" : app.status} />
                </div>
              </div>

              {app.approver_name && (
                <div className="card p-5">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted mb-4">Approval flow</div>
                  <div className="flex items-start">
                    <FlowNode name={applicantName} pictureUrl={applicantPictureUrl} label="Applied" sublabel={formatDateTime(app.applied_at)} />
                    <FlowConnector status={app.status} />
                    <FlowNode
                      name={app.approver_name}
                      pictureUrl={app.approver_picture_url}
                      label={managerLabel}
                      sublabel={lastAction ? formatDateTime(lastAction.acted_at) : undefined}
                      dim={app.status === "CANCELLED"}
                    />
                  </div>
                  {app.status === "PENDING" && (
                    <div className="text-[11.5px] text-warning text-center mt-1">Awaiting {app.approver_name}'s review</div>
                  )}
                </div>
              )}

              <dl className="card divide-y divide-border">
                <Row label="Applied days" value={String(app.applied_days)} />
                <Row label="Sandwich days added" value={String(app.sandwich_days_added)} />
                <Row label="Total deducted" value={String(app.total_deducted_days)} />
                <Row label="Loss of pay" value={app.is_lop ? "Yes" : "No"} />
                <Row label="Reason" value={app.reason || "—"} />
                <Row label="Applied at" value={new Date(app.applied_at).toLocaleString()} />
              </dl>

              {canCancel && (
                <div className="flex justify-end">
                  <CancelButton applicationId={app.id} onCancelled={refetch} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-5 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
