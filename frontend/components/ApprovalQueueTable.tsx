"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveApplication, rejectApplication } from "@/lib/api/leave";
import { LeaveApplication } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";

export default function ApprovalQueueTable({ applications }: { applications: LeaveApplication[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  async function handleApprove(id: number) {
    setBusyId(id);
    try {
      await approveApplication(id);
      showToast("Leave request approved.", "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "Could not approve this request.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: number) {
    setBusyId(id);
    try {
      await rejectApplication(id, comment || undefined);
      setRejectingId(null);
      setComment("");
      showToast("Leave request rejected.", "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "Could not reject this request.", "error");
    } finally {
      setBusyId(null);
    }
  }

  if (applications.length === 0) {
    return <div className="px-5 py-10 text-center text-sm text-muted">No pending approvals.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted border-b border-border">
          <th className="px-5 py-2.5 font-medium">Type</th>
          <th className="px-5 py-2.5 font-medium">Dates</th>
          <th className="px-5 py-2.5 font-medium">Days</th>
          <th className="px-5 py-2.5 font-medium">Reason</th>
          <th className="px-5 py-2.5 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {applications.map((app) => (
          <tr key={app.id} className="border-b border-border last:border-0 align-top">
            <td className="px-5 py-3 font-medium">{app.leave_type_code}</td>
            <td className="px-5 py-3 text-muted">
              {app.start_date} → {app.end_date}
            </td>
            <td className="px-5 py-3 tabular-nums">{app.total_deducted_days}</td>
            <td className="px-5 py-3 text-muted max-w-xs">{app.reason || "—"}</td>
            <td className="px-5 py-3">
              {rejectingId === app.id ? (
                <div className="space-y-2 w-56">
                  <input
                    className="input text-xs"
                    placeholder="Reason for rejection"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(app.id)} disabled={busyId === app.id} className="btn-primary text-xs bg-danger">
                      Confirm
                    </button>
                    <button onClick={() => setRejectingId(null)} className="btn-secondary text-xs">
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleApprove(app.id)} disabled={busyId === app.id} className="btn-primary text-xs">
                    Approve
                  </button>
                  <button onClick={() => setRejectingId(app.id)} className="btn-secondary text-xs">
                    Reject
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
