"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSalaryStructure, listSalaryStructures } from "@/lib/api/compensation";
import { SalaryStructure } from "@/lib/types";

const EMPTY = { name: "", description: "" };

export default function SalaryStructuresPage() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setStructures(await listSalaryStructures());
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSalaryStructure(form);
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Salary structures</h1>
          <p className="text-sm text-muted">Named templates composed of salary components, assigned to employees.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "New structure"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Description</th>
              <th className="px-5 py-2.5 font-medium">Components</th>
              <th className="px-5 py-2.5 font-medium">Active</th>
              <th className="px-5 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {structures.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-5 py-3 text-muted">{s.description || "--"}</td>
                <td className="px-5 py-3 text-muted">{s.components.length}</td>
                <td className="px-5 py-3">{s.is_active ? "Yes" : "No"}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/compensation/structures/${s.id}`} className="text-xs font-medium text-brand">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
