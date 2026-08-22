"use client";

import { useEffect, useState } from "react";
import { createBalanceAdjustment, listEmployees, listLeaveTypes } from "@/lib/api/admin";
import { Employee, LeaveType } from "@/lib/types";

export default function AdminBalanceAdjustmentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState({
    employee_id: "",
    leave_type_id: "",
    year: new Date().getFullYear(),
    delta_days: "",
    comment: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployees().then(setEmployees);
    listLeaveTypes().then(setLeaveTypes);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!form.comment.trim()) {
      setError("A comment is required for every manual adjustment.");
      return;
    }
    try {
      await createBalanceAdjustment(Number(form.employee_id), {
        leave_type_id: Number(form.leave_type_id),
        year: Number(form.year),
        delta_days: Number(form.delta_days),
        comment: form.comment,
      });
      setMessage("Balance adjusted and logged to the audit trail.");
      setForm({ ...form, delta_days: "", comment: "" });
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Manual balance adjustment</h1>
        <p className="text-sm text-muted">Grant or deduct leave days. A comment is mandatory for accountability.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Employee</label>
          <select className="input" required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Leave type</label>
          <select className="input" required value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}>
            <option value="">Select leave type</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.code}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Year</label>
            <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Delta days (+/-)</label>
            <input type="number" step="0.5" className="input" required value={form.delta_days} onChange={(e) => setForm({ ...form, delta_days: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Comment (required)</label>
          <textarea className="input" rows={3} required value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        </div>
        {error && <div className="text-sm text-danger">{error}</div>}
        {message && <div className="text-sm text-success">{message}</div>}
        <button type="submit" className="btn-primary">Apply adjustment</button>
      </form>
    </div>
  );
}
