"use client";

import { useEffect, useMemo, useState } from "react";
import { getEmployeeTree, listDepartments } from "@/lib/api/admin";
import { Department, EmployeeTreeNode } from "@/lib/types";
import EmployeeTreeColumns from "@/components/EmployeeTreeColumns";
import DepartmentTree from "@/components/DepartmentTree";

const TABS = ["Employee Tree", "Department Tree", "Department Directory"] as const;
type Tab = (typeof TABS)[number];

export default function OrgChartPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Employee Tree");
  const [roots, setRoots] = useState<EmployeeTreeNode[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEmployeeTree(), listDepartments()]).then(([tree, depts]) => {
      setRoots(tree);
      setDepartments(depts);
      setLoading(false);
    });
  }, []);

  // Department rosters/headcounts come from the tree itself (name/role/department only) rather
  // than the admin-only full employee roster, since this page is visible to every employee.
  const employeesByDept = useMemo(() => {
    const byDept = new Map<number, EmployeeTreeNode[]>();
    function walk(nodes: EmployeeTreeNode[]) {
      for (const node of nodes) {
        byDept.set(node.department_id, [...(byDept.get(node.department_id) || []), node]);
        walk(node.reports);
      }
    }
    walk(roots);
    return byDept;
  }, [roots]);

  const employeeCountByDept = useMemo(() => {
    const counts = new Map<number, number>();
    for (const [deptId, employees] of employeesByDept) counts.set(deptId, employees.length);
    return counts;
  }, [employeesByDept]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Org chart</h1>
        <p className="text-sm text-muted">Reporting hierarchy and department structure across the organization.</p>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-10 text-center">Loading...</div>
      ) : (
        <div className="card p-5">
          {activeTab === "Employee Tree" && <EmployeeTreeColumns roots={roots} />}
          {activeTab === "Department Tree" && <DepartmentTree departments={departments} employeesByDept={employeesByDept} />}
          {activeTab === "Department Directory" && (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.name}</td>
                    <td className="tabular-nums">{employeeCountByDept.get(d.id) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
