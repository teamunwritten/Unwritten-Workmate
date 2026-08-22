"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmployee } from "@/lib/api/admin";
import { Department, Employee, EmployeeRole, roleLabel } from "@/lib/types";

export default function EmployeeEditPanel({
  employee,
  departments,
  managers,
}: {
  employee: Employee;
  departments: Department[];
  managers: Employee[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: employee.full_name,
    email: employee.email,
    position: employee.position || "",
    phone_number: employee.phone_number || "",
    personal_email: employee.personal_email || "",
    address: employee.address || "",
    emergency_contact_name: employee.emergency_contact_name || "",
    emergency_contact_phone: employee.emergency_contact_phone || "",
    department_id: String(employee.department_id),
    manager_id: employee.manager_id ? String(employee.manager_id) : "",
    employment_status: employee.employment_status,
    role: employee.role,
    notice_period_start: employee.notice_period_start || "",
    notice_period_end: employee.notice_period_end || "",
    date_of_birth: employee.date_of_birth || "",
    is_active: employee.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateEmployee(employee.id, {
        full_name: form.full_name,
        email: form.email,
        position: form.position.trim() || null,
        phone_number: form.phone_number.trim() || null,
        personal_email: form.personal_email.trim() || null,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        department_id: Number(form.department_id),
        manager_id: form.manager_id ? Number(form.manager_id) : null,
        employment_status: form.employment_status,
        role: form.role,
        notice_period_start: form.notice_period_start || null,
        notice_period_end: form.notice_period_end || null,
        date_of_birth: form.date_of_birth || null,
        is_active: form.is_active,
      });
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="text-sm font-semibold">Edit employment details</div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted mb-1.5">Full name</label>
          <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted mb-1.5">Email (must be a real Google account for sign-in)</label>
          <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted mb-1.5">Position (job title)</label>
          <input className="input" placeholder="e.g. Software Engineer" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Department</label>
          <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Manager</label>
          <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
            <option value="">No manager</option>
            {managers.filter((m) => m.id !== employee.id).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Employment status</label>
          <select className="input" value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value as any })}>
            {["PROBATION", "ACTIVE", "NOTICE_PERIOD", "TERMINATED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Date of birth</label>
          <input type="date" className="input" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
            {(["EMPLOYEE", "MANAGER", "HR_ADMIN"] as EmployeeRole[]).map((s) => (
              <option key={s} value={s}>{roleLabel(s)}</option>
            ))}
          </select>
        </div>
        {form.employment_status === "NOTICE_PERIOD" && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Notice start</label>
              <input type="date" className="input" value={form.notice_period_start} onChange={(e) => setForm({ ...form, notice_period_start: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Notice end</label>
              <input type="date" className="input" value={form.notice_period_end} onChange={(e) => setForm({ ...form, notice_period_end: e.target.value })} />
            </div>
          </>
        )}

        <div className="col-span-2 pt-2 border-t border-border text-xs font-semibold uppercase tracking-wide text-muted">
          Contact details
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Phone number</label>
          <input className="input" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Personal email</label>
          <input type="email" className="input" value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted mb-1.5">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Emergency contact name</label>
          <input className="input" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Emergency contact phone</label>
          <input className="input" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        Active
      </label>

      {error && <div className="text-sm text-danger">{error}</div>}
      {saved && <div className="text-sm text-success">Changes saved.</div>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
