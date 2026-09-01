"use client";

import { useEffect, useState } from "react";
import { createSalaryComponent, listSalaryComponents, updateSalaryComponent } from "@/lib/api/compensation";
import { SalaryComponent } from "@/lib/types";

const EMPTY = {
  code: "",
  name: "",
  component_type: "EARNING",
  calculation_type: "FIXED",
  percentage_of_basic: "",
  is_taxable: true,
};

export default function SalaryComponentsPage() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setComponents(await listSalaryComponents());
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSalaryComponent({
      code: form.code,
      name: form.name,
      component_type: form.component_type,
      calculation_type: form.calculation_type,
      percentage_of_basic:
        form.calculation_type === "PERCENTAGE_OF_BASIC" || form.calculation_type === "PERCENTAGE_OF_CTC"
          ? Number(form.percentage_of_basic)
          : null,
      is_taxable: form.is_taxable,
    });
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  async function toggleActive(c: SalaryComponent) {
    await updateSalaryComponent(c.id, { is_active: !c.is_active });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Salary components</h1>
          <p className="text-sm text-muted">The building blocks of a salary structure -- Basic, HRA, deductions, etc.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "New component"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Code</label>
            <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Type</label>
            <select className="input" value={form.component_type} onChange={(e) => setForm({ ...form, component_type: e.target.value })}>
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Calculation</label>
            <select
              className="input"
              value={form.calculation_type}
              onChange={(e) => setForm({ ...form, calculation_type: e.target.value })}
            >
              <option value="FIXED">Fixed amount</option>
              <option value="PERCENTAGE_OF_BASIC">Percentage of Basic</option>
              <option value="PERCENTAGE_OF_CTC">Percentage of CTC (monthly)</option>
            </select>
          </div>
          {(form.calculation_type === "PERCENTAGE_OF_BASIC" || form.calculation_type === "PERCENTAGE_OF_CTC") && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                {form.calculation_type === "PERCENTAGE_OF_CTC" ? "Percentage of CTC" : "Percentage of Basic"}
              </label>
              <input
                type="number"
                step="0.01"
                className="input"
                required
                value={form.percentage_of_basic}
                onChange={(e) => setForm({ ...form, percentage_of_basic: e.target.value })}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_taxable} onChange={(e) => setForm({ ...form, is_taxable: e.target.checked })} />
            Taxable
          </label>
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
              <th className="px-5 py-2.5 font-medium">Code</th>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Type</th>
              <th className="px-5 py-2.5 font-medium">Calculation</th>
              <th className="px-5 py-2.5 font-medium">Taxable</th>
              <th className="px-5 py-2.5 font-medium">Active</th>
              <th className="px-5 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-muted">{c.code}</td>
                <td className="px-5 py-3">{c.name}</td>
                <td className="px-5 py-3 text-muted">{c.component_type}</td>
                <td className="px-5 py-3 text-muted">
                  {c.calculation_type === "PERCENTAGE_OF_BASIC" && `${c.percentage_of_basic}% of Basic`}
                  {c.calculation_type === "PERCENTAGE_OF_CTC" && `${c.percentage_of_basic}% of CTC`}
                  {c.calculation_type !== "PERCENTAGE_OF_BASIC" && c.calculation_type !== "PERCENTAGE_OF_CTC" && c.calculation_type}
                </td>
                <td className="px-5 py-3">{c.is_taxable ? "Yes" : "No"}</td>
                <td className="px-5 py-3">{c.is_active ? "Yes" : "No"}</td>
                <td className="px-5 py-3 text-right">
                  <button className="text-xs font-medium text-brand" onClick={() => toggleActive(c)}>
                    {c.is_active ? "Deactivate" : "Activate"}
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
