"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { addStructureComponent, getSalaryStructure, listSalaryComponents } from "@/lib/api/compensation";
import { SalaryComponent, SalaryStructure } from "@/lib/types";

export default function SalaryStructureDetailPage() {
  const params = useParams();
  const structureId = Number(params.id);
  const [structure, setStructure] = useState<SalaryStructure | null>(null);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [defaultValue, setDefaultValue] = useState("");

  async function load() {
    const [s, c] = await Promise.all([getSalaryStructure(structureId), listSalaryComponents()]);
    setStructure(s);
    setComponents(c);
  }
  useEffect(() => {
    load();
  }, [structureId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComponentId) return;
    await addStructureComponent(structureId, {
      salary_component_id: Number(selectedComponentId),
      default_value: defaultValue ? Number(defaultValue) : null,
      display_order: structure?.components.length ?? 0,
    });
    setSelectedComponentId("");
    setDefaultValue("");
    load();
  }

  if (!structure) return <div className="text-sm text-muted">Loading...</div>;

  const availableComponents = components.filter(
    (c) => c.is_active && !structure.components.some((sc) => sc.salary_component_id === c.id)
  );
  const selectedComponent = components.find((c) => c.id === Number(selectedComponentId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">{structure.name}</h1>
        <p className="text-sm text-muted">{structure.description || "Manage the line items on this structure."}</p>
      </div>

      <form onSubmit={handleAdd} className="card p-5 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted mb-1.5">Component</label>
          <select className="input" value={selectedComponentId} onChange={(e) => setSelectedComponentId(e.target.value)}>
            <option value="">Select a component</option>
            {availableComponents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
        {selectedComponent?.calculation_type === "FIXED" && (
          <div className="w-40">
            <label className="block text-xs font-medium text-muted mb-1.5">Fixed amount</label>
            <input type="number" className="input" value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} />
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={!selectedComponentId}>
          Add
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Code</th>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Type</th>
              <th className="px-5 py-2.5 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {structure.components.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-muted">{c.component_code}</td>
                <td className="px-5 py-3">{c.component_name}</td>
                <td className="px-5 py-3 text-muted">{c.component_type}</td>
                <td className="px-5 py-3 tabular-nums">
                  {c.calculation_type === "PERCENTAGE_OF_BASIC" ? "% of Basic" : c.default_value ?? "--"}
                </td>
              </tr>
            ))}
            {structure.components.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No components added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
