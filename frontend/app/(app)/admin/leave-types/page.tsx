"use client";

import { useEffect, useState } from "react";
import { createLeaveType, listLeaveTypes } from "@/lib/api/admin";
import { LeaveType } from "@/lib/types";

const EMPTY = { code: "", name: "", default_annual_days: 0, accrual_mode: "UPFRONT", allow_lop_conversion: false };

export default function AdminLeaveTypesPage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setTypes(await listLeaveTypes());
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createLeaveType({ ...form, default_annual_days: Number(form.default_annual_days) });
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Leave types</h1>
          <p className="text-sm text-muted">Default entitlement caps and accrual modes.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "New leave type"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Code</label>
            <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Default annual days</label>
            <input type="number" step="0.5" className="input" value={form.default_annual_days} onChange={(e) => setForm({ ...form, default_annual_days: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Accrual mode</label>
            <select className="input" value={form.accrual_mode} onChange={(e) => setForm({ ...form, accrual_mode: e.target.value })}>
              {["UPFRONT", "MONTHLY", "QUARTERLY"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.allow_lop_conversion} onChange={(e) => setForm({ ...form, allow_lop_conversion: e.target.checked })} />
            Allow zero-balance conversion to LOP
          </label>
          <div className="col-span-2">
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Code</th>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Default days</th>
              <th className="px-5 py-2.5 font-medium">Accrual</th>
              <th className="px-5 py-2.5 font-medium">LOP</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{t.code}</td>
                <td className="px-5 py-3">{t.name}</td>
                <td className="px-5 py-3 tabular-nums">{t.default_annual_days}</td>
                <td className="px-5 py-3 text-muted">{t.accrual_mode}</td>
                <td className="px-5 py-3">{t.allow_lop_conversion ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
