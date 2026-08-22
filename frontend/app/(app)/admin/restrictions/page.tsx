"use client";

import { useEffect, useState } from "react";
import {
  createRestrictionRule,
  deleteRestrictionRule,
  listLeaveTypes,
  listPolicyVersions,
  listRestrictionRules,
} from "@/lib/api/admin";
import { LeaveType, PolicyVersion } from "@/lib/types";

export default function AdminRestrictionsPage() {
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState({ policy_version_id: "", leave_type_a_id: "", leave_type_b_id: "", adjacency: "IMMEDIATELY_AFTER" });

  async function load() {
    const [v, t] = await Promise.all([listPolicyVersions(), listLeaveTypes()]);
    setVersions(v);
    setLeaveTypes(t);
    if (v.length > 0) {
      setForm((f) => ({ ...f, policy_version_id: String(v[0].id) }));
      setRules(await listRestrictionRules(v[0].id));
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createRestrictionRule({
      policy_version_id: Number(form.policy_version_id),
      leave_type_a_id: Number(form.leave_type_a_id),
      leave_type_b_id: Number(form.leave_type_b_id),
      adjacency: form.adjacency,
      is_blocked: true,
    });
    setRules(await listRestrictionRules(Number(form.policy_version_id)));
  }

  async function handleDelete(id: number) {
    await deleteRestrictionRule(id);
    setRules(await listRestrictionRules(Number(form.policy_version_id)));
  }

  const typeName = (id: number) => leaveTypes.find((t) => t.id === id)?.code || id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Restricted combinations</h1>
        <p className="text-sm text-muted">Block invalid consecutive leave-type pairings, e.g. CL immediately after SL.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">If preceded by</label>
          <select className="input" value={form.leave_type_a_id} onChange={(e) => setForm({ ...form, leave_type_a_id: e.target.value })}>
            <option value="">Select</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Block requesting</label>
          <select className="input" value={form.leave_type_b_id} onChange={(e) => setForm({ ...form, leave_type_b_id: e.target.value })}>
            <option value="">Select</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Adjacency</label>
          <select className="input" value={form.adjacency} onChange={(e) => setForm({ ...form, adjacency: e.target.value })}>
            <option value="IMMEDIATELY_AFTER">Immediately after</option>
            <option value="IMMEDIATELY_BEFORE">Immediately before</option>
            <option value="SAME_DAY">Same day</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">Add rule</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-5 py-2.5 font-medium">Rule</th>
              <th className="px-5 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  Block {typeName(r.leave_type_b_id)} {r.adjacency.replace(/_/g, " ").toLowerCase()} {typeName(r.leave_type_a_id)}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-danger font-medium">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
