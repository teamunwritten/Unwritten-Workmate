import { Department } from "@/lib/types";

function DeptNode({ dept, byParent, counts }: { dept: Department; byParent: Map<number | null, Department[]>; counts: Map<number, number> }) {
  const children = byParent.get(dept.id) || [];
  return (
    <div className="pl-4 border-l border-border">
      <div className="flex items-center gap-2 py-1.5">
        <div className="h-7 w-7 rounded-md bg-brand-soft text-brand text-[11px] font-semibold flex items-center justify-center shrink-0">
          {dept.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium leading-tight">{dept.name}</div>
          <div className="text-[11px] text-muted leading-tight">{counts.get(dept.id) || 0} employee(s)</div>
        </div>
      </div>
      {children.length > 0 && (
        <div className="ml-2">
          {children.map((child) => (
            <DeptNode key={child.id} dept={child} byParent={byParent} counts={counts} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepartmentTree({ departments, counts }: { departments: Department[]; counts: Map<number, number> }) {
  const byParent = new Map<number | null, Department[]>();
  for (const d of departments) {
    const key = d.parent_department_id ?? null;
    byParent.set(key, [...(byParent.get(key) || []), d]);
  }
  const roots = byParent.get(null) || [];

  if (roots.length === 0) {
    return <div className="text-sm text-muted py-6 text-center">No departments found.</div>;
  }

  return (
    <div className="space-y-2">
      {roots.map((root) => (
        <DeptNode key={root.id} dept={root} byParent={byParent} counts={counts} />
      ))}
    </div>
  );
}
