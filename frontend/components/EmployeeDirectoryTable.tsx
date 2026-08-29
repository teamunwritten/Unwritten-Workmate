"use client";

import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from "react";
import Link from "next/link";
import { bulkSetEmployeeStatus, listEmployeeDirectory } from "@/lib/api/admin";
import { Employee } from "@/lib/types";
import Avatar from "@/components/Avatar";
import Pagination from "@/components/Pagination";
import SortableHeader from "@/components/SortableHeader";
import SearchInput from "@/components/SearchInput";
import BulkActionBar from "@/components/BulkActionBar";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success",
  PROBATION: "bg-warning-soft text-warning",
  NOTICE_PERIOD: "bg-danger-soft text-danger",
  TERMINATED: "bg-canvas text-muted",
};

export interface EmployeeDirectoryTableHandle {
  reload: () => void;
}

const EmployeeDirectoryTable = forwardRef<EmployeeDirectoryTableHandle, { onTotalChange?: (total: number) => void }>(
  function EmployeeDirectoryTable({ onTotalChange }, ref) {
    const { showToast } = useToast();
    const confirm = useConfirm();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sortBy, setSortBy] = useState("full_name");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        const result = await listEmployeeDirectory({ page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir, q: query });
        setEmployees(result.items);
        setTotal(result.total);
        onTotalChange?.(result.total);
        setSelected(new Set());
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, sortBy, sortDir, query]);

    useEffect(() => {
      load();
    }, [load]);

    useImperativeHandle(ref, () => ({ reload: load }), [load]);

    function handleSort(key: string) {
      if (sortBy === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortDir("asc");
      }
      setPage(1);
    }

    function toggleSelected(id: number) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }

    function toggleSelectAll() {
      setSelected((prev) => (prev.size === employees.length ? new Set() : new Set(employees.map((e) => e.id))));
    }

    async function handleBulkStatus(isActive: boolean) {
      const verb = isActive ? "Activate" : "Deactivate";
      const ok = await confirm(`${verb} ${selected.size} selected employee(s)?`, {
        confirmLabel: verb,
        danger: !isActive,
      });
      if (!ok) return;

      setBulkBusy(true);
      try {
        const result = await bulkSetEmployeeStatus([...selected], isActive);
        showToast(`${result.updated} employee(s) ${isActive ? "activated" : "deactivated"}.`, "success");
        await load();
      } catch (err: any) {
        showToast(err.message || "Bulk update failed.", "error");
      } finally {
        setBulkBusy(false);
      }
    }

    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search employee" className="w-64" />
        </div>
        <BulkActionBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          actions={[
            { label: "Activate", onClick: () => handleBulkStatus(true), disabled: bulkBusy },
            { label: "Deactivate", onClick: () => handleBulkStatus(false), variant: "danger", disabled: bulkBusy },
          ]}
        />
        {loading && employees.length === 0 ? (
          <TableSkeleton rows={8} cols={5} />
        ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox" checked={employees.length > 0 && selected.size === employees.length} onChange={toggleSelectAll} />
                </th>
                <SortableHeader label="Basic information" sortKey="full_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date of joining" sortKey="date_of_joining" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th>Position</th>
                <SortableHeader label="Department" sortKey="department_id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Status" sortKey="employment_status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelected(emp.id)} />
                  </td>
                  <td>
                    <Link href={`/admin/employees/${emp.id}`} className="flex items-center gap-3 group">
                      <Avatar name={emp.full_name} size={32} pictureUrl={emp.picture_url} />
                      <div className="min-w-0">
                        <div className="font-medium text-ink group-hover:text-brand truncate">
                          {emp.full_name}, {emp.employee_code}
                        </div>
                        <div className="text-[11.5px] text-muted truncate">{emp.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="text-muted">{emp.date_of_joining}</td>
                  <td>{emp.position || <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{emp.department_name || "—"}</td>
                  <td>
                    <span className={`badge ${STATUS_STYLE[emp.employment_status] || "bg-canvas text-muted"}`}>
                      {emp.employment_status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/employees/${emp.id}`} className="text-brand text-xs font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-8">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    );
  }
);

export default EmployeeDirectoryTable;
