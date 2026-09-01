"use client";

import { useEffect, useState } from "react";
import { assignSalaryStructure, getEmployeeAssignment, listAssignments, listSalaryStructures } from "@/lib/api/compensation";
import { listEmployees } from "@/lib/api/admin";
import { Employee, EmployeeSalaryAssignment, EmployeeSalaryAssignmentSummary, SalaryStructure } from "@/lib/types";

export default function AssignCompensationPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [assignments, setAssignments] = useState<EmployeeSalaryAssignmentSummary[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [structureId, setStructureId] = useState("");
  const [annualCtc, setAnnualCtc] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignment, setAssignment] = useState<EmployeeSalaryAssignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAssignments() {
    setAssignments(await listAssignments());
  }

  useEffect(() => {
    listEmployees().then(setEmployees);
    listSalaryStructures().then(setStructures);
    loadAssignments();
  }, []);

  useEffect(() => {
    if (!employeeId) {
      setAssignment(null);
      return;
    }
    setLoadingAssignment(true);
    getEmployeeAssignment(Number(employeeId))
      .then(setAssignment)
      .finally(() => setLoadingAssignment(false));
  }, [employeeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !structureId) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await assignSalaryStructure(Number(employeeId), {
        salary_structure_id: Number(structureId),
        effective_from: effectiveFrom,
        annual_ctc: Number(annualCtc),
      });
      setAssignment(result);
      setStructureId("");
      setAnnualCtc("");
      loadAssignments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function selectEmployee(id: number) {
    setEmployeeId(String(id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const unassignedCount = employees.length - assignments.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Assign compensation</h1>
        <p className="text-sm text-muted">Assign a salary structure and CTC to an employee.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Employee</label>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select an employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.employee_code})
              </option>
            ))}
          </select>
        </div>

        {employeeId && loadingAssignment && <p className="text-sm text-muted">Loading current assignment...</p>}

        {employeeId && !loadingAssignment && assignment && (
          <div className="rounded-md border border-border p-4 space-y-2">
            <p className="text-sm font-medium">
              Current: {assignment.salary_structure_name} -- CTC {assignment.annual_ctc.toLocaleString()} (effective {assignment.effective_from})
            </p>
            <table className="w-full text-sm">
              <tbody>
                {assignment.component_values.map((v) => (
                  <tr key={v.salary_component_id}>
                    <td className="py-1 text-muted">{v.component_name}</td>
                    <td className="py-1 text-right tabular-nums">{v.resolved_value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {employeeId && (
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 items-end pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Salary structure</label>
              <select className="input" required value={structureId} onChange={(e) => setStructureId(e.target.value)}>
                <option value="">Select a structure</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Annual CTC</label>
              <input type="number" className="input" required value={annualCtc} onChange={(e) => setAnnualCtc(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Effective from</label>
              <input
                type="date"
                className="input"
                required
                min={employees.find((e) => e.id === Number(employeeId))?.date_of_joining}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            {error && <div className="col-span-3 text-sm text-danger">{error}</div>}
            <div className="col-span-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : assignment ? "Reassign" : "Assign"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Already assigned</h2>
          <p className="text-xs text-muted">
            {assignments.length} assigned{unassignedCount > 0 ? ` · ${unassignedCount} not yet assigned` : ""}
          </p>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border">
                <th className="px-5 py-2.5 font-medium">Employee</th>
                <th className="px-5 py-2.5 font-medium">Salary structure</th>
                <th className="px-5 py-2.5 font-medium">Annual CTC</th>
                <th className="px-5 py-2.5 font-medium">Effective from</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.employee_id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">
                    {a.employee_name} <span className="text-muted font-normal">({a.employee_code})</span>
                  </td>
                  <td className="px-5 py-3 text-muted">{a.salary_structure_name}</td>
                  <td className="px-5 py-3 tabular-nums">{a.annual_ctc.toLocaleString()}</td>
                  <td className="px-5 py-3 text-muted">{a.effective_from}</td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-xs font-medium text-brand" onClick={() => selectEmployee(a.employee_id)}>
                      Reassign
                    </button>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted">
                    No employees have been assigned a salary structure yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
