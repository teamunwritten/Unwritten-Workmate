"use client";

import { useEffect, useRef, useState } from "react";
import { createDepartment, createEmployee, listDepartments, listEmployees } from "@/lib/api/admin";
import { Department, Employee, EmployeeRole, roleLabel } from "@/lib/types";
import Icon from "@/components/Icon";
import EmployeeDirectoryTable, { EmployeeDirectoryTableHandle } from "@/components/EmployeeDirectoryTable";

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

export default function AdminEmployeesPage() {
  // Full, unpaginated roster -- used only to populate the "Manager" dropdown in the create form,
  // which needs every employee regardless of what page the directory table below is showing.
  const [managerOptions, setManagerOptions] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tableRef = useRef<EmployeeDirectoryTableHandle>(null);

  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", parent_department_id: "" });
  const [deptError, setDeptError] = useState<string | null>(null);
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  async function load() {
    const [emps, depts] = await Promise.all([listEmployees(), listDepartments()]);
    setManagerOptions(emps);
    setDepartments(depts);
  }

  useEffect(() => {
    load();
  }, []);

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
        manager_id: form.role === "HR_ADMIN" || !form.manager_id ? null : Number(form.manager_id),
        date_of_birth: form.date_of_birth || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
      tableRef.current?.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    setDeptError(null);
    setDeptSubmitting(true);
    try {
      await createDepartment({
        name: deptForm.name.trim(),
        parent_department_id: deptForm.parent_department_id ? Number(deptForm.parent_department_id) : null,
      });
      setDeptForm({ name: "", parent_department_id: "" });
      setShowDeptForm(false);
      await load();
    } catch (err: any) {
      setDeptError(err.message);
    } finally {
      setDeptSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Employees</h1>
          <p className="text-sm text-muted">Total employees: {total}</p>
        </div>
        <button className="btn-primary text-sm flex items-center gap-1.5" onClick={() => setShowForm((v) => !v)}>
          <Icon name="apply" className="h-4 w-4" />
          {showForm ? "Close" : "Add"}
        </button>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold">Departments</h2>
          <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={() => setShowDeptForm((v) => !v)}>
            <Icon name="apply" className="h-4 w-4" />
            {showDeptForm ? "Close" : "Add department"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {departments.map((d) => (
            <span key={d.id} className="badge bg-canvas text-muted">
              {d.name}
              {d.parent_department_id != null && (
                <span> · under {departments.find((p) => p.id === d.parent_department_id)?.name ?? "?"}</span>
              )}
            </span>
          ))}
          {departments.length === 0 && <span className="text-sm text-muted">No departments yet.</span>}
        </div>

        {showDeptForm && (
          <form onSubmit={handleAddDepartment} className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <Field label="Name">
              <input
                className="input"
                required
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              />
            </Field>
            <Field label="Parent department (optional)">
              <select
                className="input"
                value={deptForm.parent_department_id}
                onChange={(e) => setDeptForm({ ...deptForm, parent_department_id: e.target.value })}
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            {deptError && <div className="col-span-2 text-sm text-danger">{deptError}</div>}
            <div className="col-span-2">
              <button type="submit" disabled={deptSubmitting} className="btn-primary">
                {deptSubmitting ? "Creating..." : "Create department"}
              </button>
            </div>
          </form>
        )}
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
            <select
              className="input"
              disabled={form.role === "HR_ADMIN"}
              value={form.role === "HR_ADMIN" ? "" : form.manager_id}
              onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
            >
              <option value="">{form.role === "HR_ADMIN" ? "Admins have no manager" : "No manager"}</option>
              {managerOptions.map((e) => (
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
            <select
              className="input"
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as EmployeeRole;
                setForm({ ...form, role, manager_id: role === "HR_ADMIN" ? "" : form.manager_id });
              }}
            >
              {(["EMPLOYEE", "MANAGER", "HR_ADMIN"] as EmployeeRole[]).map((s) => (
                <option key={s} value={s}>{roleLabel(s)}</option>
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

      <EmployeeDirectoryTable ref={tableRef} onTotalChange={setTotal} />
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
