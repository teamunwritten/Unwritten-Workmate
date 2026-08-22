"use client";

import { useEffect, useState } from "react";
import { createLeaveType, listLeaveTypes, updateLeaveType } from "@/lib/api/admin";
import { LeaveType } from "@/lib/types";

const EMPTY = { code: "", name: "", default_annual_days: 0, accrual_mode: "UPFRONT", allow_lop_conversion: false };

export default function AdminLeaveTypesPage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDays, setEditDays] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

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

  function startEdit(t: LeaveType) {
    setEditingId(t.id);
    setEditDays(String(t.default_annual_days));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDays("");
  }

  async function saveEdit(id: number) {
    setSavingId(id);
    try {
      await updateLeaveType(id, { default_annual_days: Number(editDays) });
      setEditingId(null);
      setEditDays("");
      await load();
    } finally {
      setSavingId(null);
    }
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
              <th className="px-5 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{t.code}</td>
                <td className="px-5 py-3">{t.name}</td>
                <td className="px-5 py-3 tabular-nums">
                  {editingId === t.id ? (
                    <input
                      type="number"
                      step="0.5"
                      autoFocus
                      className="input w-20 py-1"
                      value={editDays}
                      onChange={(e) => setEditDays(e.target.value)}
                    />
                  ) : (
                    t.default_annual_days
                  )}
                </td>
                <td className="px-5 py-3 text-muted">{t.accrual_mode}</td>
                <td className="px-5 py-3">{t.allow_lop_conversion ? "Yes" : "No"}</td>
                <td className="px-5 py-3 text-right">
                  {editingId === t.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-xs font-medium text-brand disabled:opacity-50"
                        disabled={savingId === t.id}
                        onClick={() => saveEdit(t.id)}
                      >
                        Save
                      </button>
                      <button className="text-xs text-muted" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="text-xs font-medium text-brand" onClick={() => startEdit(t)}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
