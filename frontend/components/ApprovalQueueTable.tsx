"use client";

import { useCallback, useEffect, useState } from "react";
import { approveApplication, bulkApprovalAction, listPendingApprovalsPage, rejectApplication } from "@/lib/api/leave";
import { LeaveApplication } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import Pagination from "@/components/Pagination";
import SortableHeader from "@/components/SortableHeader";
import BulkActionBar from "@/components/BulkActionBar";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import Avatar from "@/components/Avatar";

export default function ApprovalQueueTable() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string>("applied_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPendingApprovalsPage({ page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir });
      setApplications(result.items);
      setTotal(result.total);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === applications.length ? new Set() : new Set(applications.map((a) => a.id))));
  }

  async function handleApprove(id: number) {
    setBusyId(id);
    try {
      await approveApplication(id);
      showToast("Leave request approved.", "success");
      await load();
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
      await load();
    } catch (err: any) {
      showToast(err.message || "Could not reject this request.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulk(action: "APPROVE" | "REJECT") {
    const ok = await confirm(`${action === "APPROVE" ? "Approve" : "Reject"} ${selected.size} selected request(s)?`, {
      confirmLabel: action === "APPROVE" ? "Approve all" : "Reject all",
      danger: action === "REJECT",
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      const results = await bulkApprovalAction([...selected], action);
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        showToast(`${results.length} request(s) ${action === "APPROVE" ? "approved" : "rejected"}.`, "success");
      } else {
        showToast(`${results.length - failed.length} succeeded, ${failed.length} failed.`, failed.length === results.length ? "error" : "success");
      }
      await load();
    } catch (err: any) {
      showToast(err.message || "Bulk action failed.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading && applications.length === 0) {
    return <TableSkeleton rows={6} cols={5} />;
  }

  if (!loading && total === 0) {
    return <div className="px-5 py-10 text-center text-sm text-muted">No pending approvals.</div>;
  }

  return (
    <div>
      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Approve selected", onClick: () => handleBulk("APPROVE"), disabled: bulkBusy },
          { label: "Reject selected", onClick: () => handleBulk("REJECT"), variant: "danger", disabled: bulkBusy },
        ]}
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-border">
            <th className="px-5 py-2.5 font-medium w-8">
              <input
                type="checkbox"
                checked={applications.length > 0 && selected.size === applications.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="px-5 py-2.5 font-medium">Employee</th>
            <th className="px-5 py-2.5 font-medium">Type</th>
            <SortableHeader label="Dates" sortKey="applied_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
            <th className="px-5 py-2.5 font-medium">Days</th>
            <th className="px-5 py-2.5 font-medium">Reason</th>
            <SortableHeader label="Level" sortKey="pending_level" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
            <th className="px-5 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="border-b border-border last:border-0 align-top">
              <td className="px-5 py-3">
                <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelected(app.id)} />
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={app.employee_name || "?"} size={26} pictureUrl={app.employee_picture_url ?? null} />
                  <div className="min-w-0">
                    <div className="font-medium text-ink truncate">{app.employee_name || "Unknown"}</div>
                    {app.employee_code && <div className="text-[11px] text-muted truncate">{app.employee_code}</div>}
                  </div>
                </div>
              </td>
              <td className="px-5 py-3 font-medium">{app.leave_type_code}</td>
              <td className="px-5 py-3 text-muted">
                {app.start_date} → {app.end_date}
              </td>
              <td className="px-5 py-3 tabular-nums">{app.total_deducted_days}</td>
              <td className="px-5 py-3 text-muted max-w-xs">{app.reason || "—"}</td>
              <td className="px-5 py-3 text-muted">{app.pending_level ?? "—"}</td>
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
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
