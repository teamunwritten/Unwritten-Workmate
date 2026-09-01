"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  approveRunPayslips,
  generatePayslips,
  getPayrollRun,
  listPayslipTemplates,
  recomputePayrollRun,
  updatePayrollRunStatus,
} from "@/lib/api/payroll";
import { PayrollRunDetail, PayslipTemplate } from "@/lib/types";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const NEXT_STATUS: Record<string, string | null> = {
  DRAFT: "PROCESSING",
  PROCESSING: "COMPLETED",
  COMPLETED: null,
};

export default function PayrollRunDetailPage() {
  const params = useParams();
  const runId = Number(params.id);
  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [templates, setTemplates] = useState<PayslipTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const { showToast } = useToast();

  async function load() {
    const [r, t] = await Promise.all([getPayrollRun(runId), listPayslipTemplates()]);
    setRun(r);
    setTemplates(t);
  }
  useEffect(() => {
    load();
  }, [runId]);

  async function advanceStatus() {
    if (!run) return;
    const next = NEXT_STATUS[run.status];
    if (!next) return;
    setBusy(true);
    try {
      await updatePayrollRunStatus(run.id, next);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleRecompute() {
    if (!run) return;
    const ok = await confirm(
      `Re-resolve every entry for ${MONTHS[run.period_month - 1]} ${run.period_year} against each employee's current salary assignment? Already-approved payslips are left untouched.`,
      { title: "Re-run payroll", confirmLabel: "Re-run" }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await recomputePayrollRun(run.id);
      await load();
      showToast("Payroll run re-computed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGeneratePayslips() {
    if (!run) return;
    setBusy(true);
    try {
      await generatePayslips(run.id);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveAll() {
    if (!run) return;
    const ok = await confirm(
      `Approve and email all ${draftCount} draft payslip${draftCount === 1 ? "" : "s"} for ${MONTHS[run.period_month - 1]} ${run.period_year}? Each employee will be emailed immediately.`,
      { title: "Approve payslips", confirmLabel: "Approve & Send All" }
    );
    if (!ok) return;
    setBusy(true);
    try {
      const approved = await approveRunPayslips(run.id);
      await load();
      showToast(`${approved.length} payslip${approved.length === 1 ? "" : "s"} approved and emailed.`);
    } finally {
      setBusy(false);
    }
  }

  if (!run) return <div className="text-sm text-muted">Loading...</div>;

  const next = NEXT_STATUS[run.status];
  const hasDefaultTemplate = templates.some((t) => t.is_default);
  const draftCount = run.entries.filter((e) => e.payslip_status === "DRAFT").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">
            {MONTHS[run.period_month - 1]} {run.period_year}
          </h1>
          <p className="text-sm text-muted">Status: {run.status}</p>
        </div>
        <div className="flex gap-2">
          {!hasDefaultTemplate && (
            <span className="text-xs text-muted self-center">
              Set a default in{" "}
              <Link href="/payroll/payslip-templates" className="text-brand">
                Payslip Templates
              </Link>{" "}
              to generate payslips.
            </span>
          )}
          {run.status === "DRAFT" && (
            <button className="btn-secondary text-sm" disabled={busy} onClick={handleRecompute}>
              Re-run
            </button>
          )}
          <button className="btn-secondary text-sm" disabled={busy || !hasDefaultTemplate} onClick={handleGeneratePayslips}>
            Generate payslips
          </button>
          {draftCount > 0 && (
            <button className="btn-primary text-sm" disabled={busy} onClick={handleApproveAll}>
              Approve &amp; Send All ({draftCount})
            </button>
          )}
          {next && (
            <button className="btn-secondary text-sm" disabled={busy} onClick={advanceStatus}>
              Mark as {next}
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Employee</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium">Gross</th>
              <th className="px-5 py-2.5 font-medium">Payslip</th>
            </tr>
          </thead>
          <tbody>
            {run.entries.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{e.employee_name}</td>
                <td className="px-5 py-3 text-muted">{e.status}</td>
                <td className="px-5 py-3 tabular-nums">{e.gross_amount != null ? e.gross_amount.toLocaleString() : "--"}</td>
                <td className="px-5 py-3 text-muted">
                  {e.payslip_id ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                          e.payslip_status === "APPROVED" ? "bg-[#e6f4ea] text-[#17874a]" : "bg-[#fef3e7] text-[#92400e]"
                        }`}
                      >
                        {e.payslip_status === "APPROVED" ? "Approved" : "Draft"}
                      </span>
                      <Link href={`/payroll/payslips/${e.payslip_id}`} className="text-brand font-medium">
                        View
                      </Link>
                    </div>
                  ) : (
                    "--"
                  )}
                </td>
              </tr>
            ))}
            {run.entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No employees have an active salary assignment for this run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
