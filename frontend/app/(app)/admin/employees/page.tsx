"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createEmployee, listDepartments, listEmployees } from "@/lib/api/admin";
import { Department, Employee } from "@/lib/types";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";

const EMPTY_FORM = {
  employee_code: "",
  full_name: "",
  email: "",
  position: "",
  phone_number: "",
  personal_email: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  department_id: "",
  manager_id: "",
  date_of_joining: "",
  date_of_birth: "",
  employment_status: "PROBATION",
  role: "EMPLOYEE",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success",
  PROBATION: "bg-warning-soft text-warning",
  NOTICE_PERIOD: "bg-danger-soft text-danger",
  TERMINATED: "bg-canvas text-muted",
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [emps, depts] = await Promise.all([listEmployees(), listDepartments()]);
    setEmployees(emps);
    setDepartments(depts);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q)
    );
  }, [employees, query]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createEmployee({
        ...form,
        position: form.position.trim() || null,
        phone_number: form.phone_number.trim() || null,
        personal_email: form.personal_email.trim() || null,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        department_id: Number(form.department_id),
        manager_id: form.manager_id ? Number(form.manager_id) : null,
        date_of_birth: form.date_of_birth || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Employees</h1>
          <p className="text-sm text-muted">Total employees: {employees.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search employee"
              className="input pl-9 w-56"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary text-sm flex items-center gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <Icon name="apply" className="h-4 w-4" />
            {showForm ? "Close" : "Add"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-2 gap-4">
          <Field label="Employee code">
            <input className="input" required value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
          </Field>
          <Field label="Full name">
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Email (must be their real Google account)">
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Position (job title)">
            <input className="input" placeholder="e.g. Software Engineer" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </Field>
          <Field label="Department">
            <select className="input" required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Manager (optional)">
            <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
              <option value="">No manager</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date of joining">
            <input type="date" className="input" required value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} />
          </Field>
          <Field label="Date of birth (optional)">
            <input type="date" className="input" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </Field>
          <Field label="Employment status">
            <select className="input" value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value })}>
              {["PROBATION", "ACTIVE", "NOTICE_PERIOD", "TERMINATED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {["EMPLOYEE", "MANAGER", "HR_ADMIN"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <div className="col-span-2 pt-2 border-t border-border text-xs font-semibold uppercase tracking-wide text-muted">
            Contact details (optional)
          </div>
          <Field label="Phone number">
            <input className="input" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </Field>
          <Field label="Personal email">
            <input type="email" className="input" value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <Field label="Emergency contact name">
            <input className="input" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
          </Field>
          <Field label="Emergency contact phone">
            <input className="input" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
          </Field>

          {error && <div className="col-span-2 text-sm text-danger">{error}</div>}
          <div className="col-span-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Creating..." : "Create employee"}
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Basic information</th>
              <th>Date of joining</th>
              <th>Position</th>
              <th>Department</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id}>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-8">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
