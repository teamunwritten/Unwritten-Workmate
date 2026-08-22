"use client";

import { useEffect, useState } from "react";
import { createPolicyVersion, listLeavePolicies, listLeaveTypes, listPolicyVersions, updateLeavePolicy } from "@/lib/api/admin";
import { LeavePolicy, LeaveType, PolicyVersion } from "@/lib/types";

export default function AdminPoliciesPage() {
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({
    version_label: "",
    effective_from: "",
    recalculation_mode: "PROSPECTIVE_ONLY",
    clone_from_version_id: "",
  });

  async function loadVersions() {
    const v = await listPolicyVersions();
    setVersions(v);
    if (v.length > 0 && selectedVersion === null) setSelectedVersion(v[0].id);
  }

  useEffect(() => {
    loadVersions();
    listLeaveTypes().then(setLeaveTypes);
  }, []);

  useEffect(() => {
    if (selectedVersion) listLeavePolicies(selectedVersion).then(setPolicies);
  }, [selectedVersion]);

  async function handleCreateVersion(e: React.FormEvent) {
    e.preventDefault();
    await createPolicyVersion({
      ...newVersion,
      clone_from_version_id: newVersion.clone_from_version_id ? Number(newVersion.clone_from_version_id) : undefined,
    });
    setShowNewVersion(false);
    await loadVersions();
  }

  async function handleUpdate(policy: LeavePolicy, field: string, value: any) {
    const updated = await updateLeavePolicy(policy.policy_version_id, policy.leave_type_id, { [field]: value });
    setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const typeName = (id: number) => leaveTypes.find((t) => t.id === id)?.code || id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Policies</h1>
          <p className="text-sm text-muted">Notice buffers, backdate limits, cutoffs, sandwich rules, and more.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input w-64" value={selectedVersion ?? ""} onChange={(e) => setSelectedVersion(Number(e.target.value))}>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.version_label} (from {v.effective_from})
              </option>
            ))}
          </select>
          <button className="btn-primary text-sm" onClick={() => setShowNewVersion((v) => !v)}>
            New version
          </button>
        </div>
      </div>

      {showNewVersion && (
        <form onSubmit={handleCreateVersion} className="card p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Version label</label>
            <input className="input" required value={newVersion.version_label} onChange={(e) => setNewVersion({ ...newVersion, version_label: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Effective from</label>
            <input type="date" className="input" required value={newVersion.effective_from} onChange={(e) => setNewVersion({ ...newVersion, effective_from: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Recalculation mode</label>
            <select className="input" value={newVersion.recalculation_mode} onChange={(e) => setNewVersion({ ...newVersion, recalculation_mode: e.target.value })}>
              <option value="PROSPECTIVE_ONLY">Prospective only</option>
              <option value="RETROSPECTIVE_RECALC">Retrospective recalculation</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Clone rules from version ID (optional)</label>
            <input className="input" value={newVersion.clone_from_version_id} onChange={(e) => setNewVersion({ ...newVersion, clone_from_version_id: e.target.value })} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary">Create version</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((policy) => (
          <div key={policy.id} className="card p-4 space-y-3">
            <div className="text-sm font-semibold">{typeName(policy.leave_type_id)}</div>
            <NumberField label="Notice buffer trigger (days)" value={policy.notice_buffer_trigger_days} onSave={(v) => handleUpdate(policy, "notice_buffer_trigger_days", v)} />
            <NumberField label="Notice buffer required (days)" value={policy.notice_buffer_required_days} onSave={(v) => handleUpdate(policy, "notice_buffer_required_days", v)} />
            <NumberField label="Max backdate (days)" value={policy.max_backdate_days} onSave={(v) => handleUpdate(policy, "max_backdate_days", v)} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Zero balance action</span>
              <select
                className="input w-40"
                value={policy.zero_balance_action}
                onChange={(e) => handleUpdate(policy, "zero_balance_action", e.target.value)}
              >
                <option value="BLOCK">Block</option>
                <option value="CONVERT_TO_LOP">Convert to LOP</option>
              </select>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Year-end behavior</span>
              <select
                className="input w-40"
                value={policy.year_end_behavior}
                onChange={(e) => handleUpdate(policy, "year_end_behavior", e.target.value)}
              >
                <option value="LAPSE_ALL">Lapse all</option>
                <option value="CARRY_FORWARD_CAPPED">Carry forward (capped)</option>
                <option value="CARRY_FORWARD_ALL">Carry forward (all)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={policy.sandwich_policy_enabled}
                onChange={(e) => handleUpdate(policy, "sandwich_policy_enabled", e.target.checked)}
              />
              Sandwich policy enabled
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, value, onSave }: { label: string; value: number | null; onSave: (v: number | null) => void }) {
  const [local, setLocal] = useState(value ?? "");
  return (
    <div className="flex items-center justify-between text-sm gap-3">
      <span className="text-muted">{label}</span>
      <input
        type="number"
        className="input w-24"
        value={local}
        onChange={(e) => setLocal(e.target.value === "" ? "" : Number(e.target.value))}
        onBlur={() => onSave(local === "" ? null : Number(local))}
      />
    </div>
  );
}
