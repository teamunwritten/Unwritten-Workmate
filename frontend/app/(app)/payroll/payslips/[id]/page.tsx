"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { approvePayslip, getPayslip } from "@/lib/api/payroll";
import { Payslip } from "@/lib/types";
import PayslipDocument from "@/components/PayslipDocument";

export default function PayslipDetailPage() {
  const params = useParams();
  const payslipId = Number(params.id);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approving, setApproving] = useState(false);

  async function load() {
    setPayslip(await getPayslip(payslipId));
  }
  useEffect(() => {
    load();
    fetch("/api/me")
      .then((res) => res.json())
      .then((user) => setIsAdmin(user?.role === "HR_ADMIN"));
  }, [payslipId]);

  async function handleApprove() {
    setApproving(true);
    try {
      await approvePayslip(payslipId);
      await load();
    } finally {
      setApproving(false);
    }
  }

  if (!payslip) return <div className="text-sm text-muted">Loading...</div>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold tracking-tight">Payslip</h1>
        <div className="flex gap-2">
          {isAdmin && payslip.status === "DRAFT" && (
            <button className="btn-primary text-sm" disabled={approving} onClick={handleApprove}>
              Approve &amp; Send to Employee
            </button>
          )}
          <button className="btn-secondary text-sm" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      <PayslipDocument payslip={payslip} />
    </div>
  );
}
