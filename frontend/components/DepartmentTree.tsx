"use client";

import { useMemo, useState } from "react";
import { Department, EmployeeTreeNode, roleLabel } from "@/lib/types";
import Avatar from "@/components/Avatar";

const CARD_HEIGHT = 60;
const GAP = 8;
const ROW_STEP = CARD_HEIGHT + GAP;
const GUTTER_WIDTH = 32;
const DEPT_COLORS = ["#2e6fe8", "#17874a", "#b06a00", "#c4271e", "#7c3aed", "#0e9aa7", "#d33a6a"];

function deptColor(id: number): string {
  return DEPT_COLORS[id % DEPT_COLORS.length];
}

function CountBadge({ count, selected }: { count: number; selected: boolean }) {
  if (count === 0) return null;
  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-md text-[11px] font-semibold px-1.5 border ${
        selected ? "bg-brand text-white border-brand" : "bg-surface text-muted border-border"
      }`}
      style={{ minWidth: 22, height: 18 }}
    >
      {count}
    </div>
  );
}

function DeptRow({ dept, count, selected, onClick }: { dept: Department; count: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: CARD_HEIGHT }}
      className={`w-64 flex items-center gap-3 rounded-lg border pl-3 pr-2 text-left transition-colors shrink-0 ${
        selected ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-border bg-surface hover:bg-canvas"
      }`}
    >
      <div
        className="h-8 w-8 rounded-md text-white text-[11px] font-semibold flex items-center justify-center shrink-0"
        style={{ backgroundColor: deptColor(dept.id) }}
      >
        {dept.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 text-sm font-semibold text-ink truncate">{dept.name}</div>
      <CountBadge count={count} selected={selected} />
    </button>
  );
}

function EmployeeRow({ employee }: { employee: EmployeeTreeNode }) {
  return (
    <div style={{ height: CARD_HEIGHT }} className="w-64 flex items-center gap-3 rounded-lg border border-border bg-surface pl-3 pr-2 shrink-0">
      <Avatar name={employee.full_name} size={34} pictureUrl={employee.picture_url} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink truncate">{employee.full_name}</div>
        <div className="text-xs text-muted truncate">{employee.position || roleLabel(employee.role)}</div>
      </div>
    </div>
  );
}

function Connector({ fromIndex, childCount }: { fromIndex: number; childCount: number }) {
  const fromY = fromIndex * ROW_STEP + CARD_HEIGHT / 2;
  const toYs = Array.from({ length: childCount }, (_, i) => i * ROW_STEP + CARD_HEIGHT / 2);
  const spineTop = Math.min(fromY, ...toYs);
  const spineHeight = Math.max(fromY, ...toYs) - spineTop;

  return (
    <div className="relative shrink-0" style={{ width: GUTTER_WIDTH }}>
      <div className="absolute bg-brand" style={{ top: fromY, left: 0, width: GUTTER_WIDTH / 2, height: 1.5 }} />
      <div className="absolute bg-brand" style={{ top: spineTop, left: GUTTER_WIDTH / 2, width: 1.5, height: spineHeight }} />
      {toYs.map((y, i) => (
        <div key={i} className="absolute bg-brand" style={{ top: y, left: GUTTER_WIDTH / 2, width: GUTTER_WIDTH / 2, height: 1.5 }} />
      ))}
    </div>
  );
}

export default function DepartmentTree({
  departments,
  employeesByDept,
}: {
  departments: Department[];
  employeesByDept: Map<number, EmployeeTreeNode[]>;
}) {
  const byParent = useMemo(() => {
    const map = new Map<number | null, Department[]>();
    for (const d of departments) {
      const key = d.parent_department_id ?? null;
      map.set(key, [...(map.get(key) || []), d]);
    }
    return map;
  }, [departments]);

  const deptHeadcount = useMemo(() => {
    function count(deptId: number): number {
      const direct = employeesByDept.get(deptId)?.length || 0;
      const childDepts = byParent.get(deptId) || [];
      return direct + childDepts.reduce((sum, child) => sum + count(child.id), 0);
    }
    const map = new Map<number, number>();
    for (const d of departments) map.set(d.id, count(d.id));
    return map;
  }, [departments, byParent, employeesByDept]);

  const roots = byParent.get(null) || [];
  const [selectedPath, setSelectedPath] = useState<number[]>(() => (roots.length > 0 ? [roots[0].id] : []));

  function handleSelect(depth: number, deptId: number) {
    setSelectedPath((prev) => [...prev.slice(0, depth), deptId]);
  }

  // Each column is either more (child) departments, or -- once a department with no children of
  // its own is selected -- that department's employee roster (a terminal, non-clickable column).
  const columns = useMemo(() => {
    type Column = { kind: "departments"; items: Department[] } | { kind: "employees"; items: EmployeeTreeNode[] };
    const cols: Column[] = [{ kind: "departments", items: roots }];
    let currentDepts = roots;
    for (const selectedId of selectedPath) {
      const selectedDept = currentDepts.find((d) => d.id === selectedId);
      if (!selectedDept) break;
      const children = byParent.get(selectedDept.id) || [];
      if (children.length > 0) {
        cols.push({ kind: "departments", items: children });
        currentDepts = children;
      } else {
        const employees = employeesByDept.get(selectedDept.id) || [];
        cols.push({ kind: "employees", items: employees });
        break;
      }
    }
    return cols;
  }, [roots, selectedPath, byParent, employeesByDept]);

  if (roots.length === 0) {
    return <div className="text-sm text-muted py-10 text-center">No departments found.</div>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start" style={{ minWidth: "max-content" }}>
        {columns.map((col, depth) => {
          const selectedId = col.kind === "departments" ? selectedPath[depth] : undefined;
          const selectedIndex = col.kind === "departments" ? col.items.findIndex((d) => d.id === selectedId) : -1;
          const nextColumn = columns[depth + 1];
          const showConnector = col.kind === "departments" && selectedIndex >= 0 && Boolean(nextColumn) && nextColumn.items.length > 0;

          return (
            <div key={depth} className="flex items-start">
              <div className="flex flex-col" style={{ gap: GAP }}>
                {col.kind === "departments"
                  ? col.items.map((dept) => (
                      <DeptRow
                        key={dept.id}
                        dept={dept}
                        count={deptHeadcount.get(dept.id) || 0}
                        selected={dept.id === selectedId}
                        onClick={() => handleSelect(depth, dept.id)}
                      />
                    ))
                  : col.items.length === 0
                    ? (
                        <div style={{ height: CARD_HEIGHT }} className="w-64 flex items-center text-xs text-muted">
                          No employees in this department.
                        </div>
                      )
                    : col.items.map((emp) => <EmployeeRow key={emp.id} employee={emp} />)}
              </div>
              {showConnector && <Connector fromIndex={selectedIndex} childCount={nextColumn.items.length} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
