"use client";

import { useEffect, useState } from "react";
import { createHoliday, deleteHoliday, listHolidays } from "@/lib/api/admin";
import { Holiday } from "@/lib/types";

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [form, setForm] = useState({ date: "", name: "", holiday_type: "STATUTORY" });

  async function load() {
    setHolidays(await listHolidays());
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createHoliday(form);
    setForm({ date: "", name: "", holiday_type: "STATUTORY" });
    load();
  }

  async function handleDelete(id: number) {
    await deleteHoliday(id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Holiday register</h1>
        <p className="text-sm text-muted">Statutory closures and the optional/floating holiday bank.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-4 gap-3 items-end">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-muted mb-1.5">Date</label>
          <input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-muted mb-1.5">Type</label>
          <select className="input" value={form.holiday_type} onChange={(e) => setForm({ ...form, holiday_type: e.target.value })}>
            <option value="STATUTORY">Statutory</option>
            <option value="OPTIONAL">Optional</option>
          </select>
        </div>
        <div className="col-span-1">
          <button type="submit" className="btn-primary w-full">Add holiday</button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Type</th>
              <th className="px-5 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {holidays
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{h.date}</td>
                  <td className="px-5 py-3 font-medium">{h.name}</td>
                  <td className="px-5 py-3 text-muted">{h.holiday_type}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDelete(h.id)} className="text-xs text-danger font-medium">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
