"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMyPayslips } from "@/lib/api/payroll";
import { Payslip } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[] | null>(null);

  useEffect(() => {
    listMyPayslips().then(setPayslips);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">My payslips</h1>
        <p className="text-sm text-muted">Payslips are listed here once an admin has approved them.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Period</th>
              <th className="px-5 py-2.5 font-medium">Net Pay</th>
              <th className="px-5 py-2.5 font-medium">Approved</th>
              <th className="px-5 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {payslips?.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">
                  {MONTHS[p.period_month - 1]} {p.period_year}
                </td>
                <td className="px-5 py-3 tabular-nums">₹{p.net_pay.toLocaleString("en-IN")}</td>
                <td className="px-5 py-3 text-muted">{p.approved_at ? new Date(p.approved_at).toLocaleDateString() : "--"}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/payroll/payslips/${p.id}`} className="text-xs font-medium text-brand">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {payslips && payslips.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No payslips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
