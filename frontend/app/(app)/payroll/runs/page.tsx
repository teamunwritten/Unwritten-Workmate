"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPayrollRun, listPayrollRuns } from "@/lib/api/payroll";
import { PayrollRun } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const now = new Date();

export default function PayrollRunsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRuns(await listPayrollRuns());
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createPayrollRun({ period_month: month, period_year: year });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to create payroll run");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Payroll runs</h1>
          <p className="text-sm text-muted">Create a run for a period and generate payslips for included employees.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "New payroll run"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Month</label>
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Year</label>
            <input type="number" className="input w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <button type="submit" className="btn-primary">
            Create
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Period</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium">Employees</th>
              <th className="px-5 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">
                  {MONTHS[r.period_month - 1]} {r.period_year}
                </td>
                <td className="px-5 py-3 text-muted">{r.status}</td>
                <td className="px-5 py-3 tabular-nums">{r.entry_count}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/payroll/runs/${r.id}`} className="text-xs font-medium text-brand">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No payroll runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
