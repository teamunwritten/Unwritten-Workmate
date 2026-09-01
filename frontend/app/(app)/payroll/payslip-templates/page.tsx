"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPayslipTemplate, listPayslipTemplates, updatePayslipTemplate } from "@/lib/api/payroll";
import { PAYSLIP_DESIGN_LABELS, Payslip, PayslipDesign, PayslipHeaderConfig, PayslipTemplate } from "@/lib/types";
import PayslipDocument from "@/components/PayslipDocument";
import { useToast } from "@/components/ToastProvider";

interface TemplateForm {
  name: string;
  design: PayslipDesign;
  company_name: string;
  company_tagline: string;
  company_legal_name: string;
  company_pan: string;
  registered_office_address: string;
  contact_email: string;
  contact_phone: string;
  logo_data_url: string;
  footer_note: string;
  is_default: boolean;
}

const EMPTY_FORM: TemplateForm = {
  name: "",
  design: "CLASSIC",
  company_name: "",
  company_tagline: "",
  company_legal_name: "",
  company_pan: "",
  registered_office_address: "",
  contact_email: "",
  contact_phone: "",
  logo_data_url: "",
  footer_note: "",
  is_default: false,
};

const MAX_LOGO_BYTES = 300 * 1024;

const DESIGN_OPTIONS = Object.entries(PAYSLIP_DESIGN_LABELS) as [PayslipDesign, string][];

const SAMPLE_PAYSLIP: Omit<Payslip, "design" | "header_config" | "footer_note"> = {
  id: 0,
  reference_number: "PS-202609-000000",
  payroll_run_entry_id: 0,
  employee_id: 0,
  employee_name: "Priya Sharma",
  employee_code: "EMP-014",
  position: "Senior Software Engineer",
  department_name: "Engineering",
  payslip_template_id: 0,
  generated_at: new Date().toISOString(),
  period_month: new Date().getMonth() + 1,
  period_year: new Date().getFullYear(),
  gross_pay: 73200,
  net_pay: 73200,
  line_items: [
    { component_code: "BASIC", component_name: "Basic", component_type: "EARNING", value: 50000 },
    { component_code: "HRA", component_name: "HRA", component_type: "EARNING", value: 25000 },
    { component_code: "PF_EMP", component_name: "PF Employee Contribution", component_type: "DEDUCTION", value: 1800 },
  ],
  status: "APPROVED",
  approved_at: new Date().toISOString(),
  approved_by_name: "HR Admin",
};

function headerConfigFromForm(form: TemplateForm): PayslipHeaderConfig {
  return {
    company_name: form.company_name || undefined,
    company_tagline: form.company_tagline || undefined,
    company_legal_name: form.company_legal_name || undefined,
    company_pan: form.company_pan || undefined,
    registered_office_address: form.registered_office_address || undefined,
    contact_email: form.contact_email || undefined,
    contact_phone: form.contact_phone || undefined,
    logo_data_url: form.logo_data_url || undefined,
  };
}

function previewFor(design: PayslipDesign, header: PayslipHeaderConfig, footerNote: string): Payslip {
  return { ...SAMPLE_PAYSLIP, design, header_config: header, footer_note: footerNote || null };
}

function TemplateCard({
  template,
  onMakeDefault,
  onEdit,
}: {
  template: PayslipTemplate;
  onMakeDefault: () => void;
  onEdit: () => void;
}) {
  const preview = previewFor(template.design, template.header_config || {}, template.footer_note || "");

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="h-64 overflow-hidden bg-[#f3f4f6] border-b border-border relative">
        <div className="absolute inset-0 origin-top-left" style={{ transform: "scale(0.42)", width: "238%" }}>
          <PayslipDocument payslip={preview} />
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{template.name}</span>
          {template.is_default && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[#e6f4ea] text-[#17874a]">
              Default
            </span>
          )}
        </div>
        <p className="text-xs text-muted">{PAYSLIP_DESIGN_LABELS[template.design]}</p>
        <div className="flex items-center gap-3 pt-1">
          {!template.is_default && (
            <button className="text-xs font-medium text-brand" onClick={onMakeDefault}>
              Set as default for all employees
            </button>
          )}
          <button className="text-xs font-medium text-muted" onClick={onEdit}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayslipTemplatesPage() {
  const [templates, setTemplates] = useState<PayslipTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function load() {
    setTemplates(await listPayslipTemplates());
  }
  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(t: PayslipTemplate) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      design: t.design,
      company_name: t.header_config?.company_name || "",
      company_tagline: t.header_config?.company_tagline || "",
      company_legal_name: t.header_config?.company_legal_name || "",
      company_pan: t.header_config?.company_pan || "",
      registered_office_address: t.header_config?.registered_office_address || "",
      contact_email: t.header_config?.contact_email || "",
      contact_phone: t.header_config?.contact_phone || "",
      logo_data_url: t.header_config?.logo_data_url || "",
      footer_note: t.footer_note || "",
      is_default: t.is_default,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      showToast(`Logo must be under ${Math.round(MAX_LOGO_BYTES / 1024)}KB.`, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo_data_url: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      design: form.design,
      header_config: headerConfigFromForm(form),
      footer_note: form.footer_note || null,
      is_default: form.is_default,
    };
    try {
      if (editingId) {
        await updatePayslipTemplate(editingId, payload);
      } else {
        await createPayslipTemplate(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(t: PayslipTemplate) {
    await updatePayslipTemplate(t.id, { is_default: true });
    load();
  }

  const previewPayslip: Payslip = useMemo(
    () => previewFor(form.design, headerConfigFromForm(form), form.footer_note),
    [form.design, form.company_name, form.company_tagline, form.company_legal_name, form.company_pan, form.registered_office_address, form.contact_email, form.contact_phone, form.logo_data_url, form.footer_note]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Payslip templates</h1>
          <p className="text-sm text-muted">
            The <span className="font-medium text-ink">default</span> template is the one used whenever payslips are generated for
            a run -- it applies to every employee until you set a different template as default.
          </p>
        </div>
        <button className="btn-primary text-sm" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
          {showForm ? "Close" : "New template"}
        </button>
      </div>

      {showForm && (
        <div className="grid grid-cols-[360px_1fr] gap-6 items-start">
          <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Template name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Design</label>
              <select className="input" value={form.design} onChange={(e) => setForm({ ...form, design: e.target.value as PayslipDesign })}>
                {DESIGN_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-1 border-t border-border">
              <p className="text-xs font-semibold text-ink pt-3 pb-1">Branding</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Company logo (optional, under 300KB)</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="input py-1.5" onChange={handleLogoChange} />
              {form.logo_data_url && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={form.logo_data_url} alt="" className="h-8 w-8 object-contain border border-border rounded" />
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() => {
                      setForm({ ...form, logo_data_url: "" });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Company name (shown in the letterhead)</label>
              <input
                className="input"
                placeholder="Unwritten Workmate"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Tagline (shown under the company name)</label>
              <input
                className="input"
                placeholder="Team Unwritten"
                value={form.company_tagline}
                onChange={(e) => setForm({ ...form, company_tagline: e.target.value })}
              />
            </div>

            <div className="pt-1 border-t border-border">
              <p className="text-xs font-semibold text-ink pt-3 pb-1">Employer details</p>
              <p className="text-[11px] text-muted -mt-1 mb-2">Shown in the payslip footer. Leave blank to omit.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Company legal name</label>
              <input
                className="input"
                placeholder="e.g. Unwritten Technologies Private Limited"
                value={form.company_legal_name}
                onChange={(e) => setForm({ ...form, company_legal_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Company PAN</label>
              <input
                className="input"
                placeholder="e.g. AAACU1234A"
                value={form.company_pan}
                onChange={(e) => setForm({ ...form, company_pan: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Registered office address</label>
              <input
                className="input"
                placeholder="e.g. 4th Floor, HSR Layout, Bengaluru 560102"
                value={form.registered_office_address}
                onChange={(e) => setForm({ ...form, registered_office_address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Contact email</label>
              <input
                type="email"
                className="input"
                placeholder="hr@company.com"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Contact phone</label>
              <input
                className="input"
                placeholder="+91 80 1234 5678"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>

            <div className="pt-1 border-t border-border">
              <p className="text-xs font-semibold text-ink pt-3 pb-1">Other</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Footer note (optional)</label>
              <input
                className="input"
                placeholder="e.g. a custom disclaimer or CIN"
                value={form.footer_note}
                onChange={(e) => setForm({ ...form, footer_note: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              Keep this as the default template
            </label>
            <div className="flex gap-2 sticky bottom-0 bg-surface pt-2 pb-1">
              <button type="submit" className="btn-primary" disabled={saving}>
                {editingId ? "Save changes" : "Create"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>

          <div>
            <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Live preview — {PAYSLIP_DESIGN_LABELS[form.design]}</p>
            <div className="max-w-2xl">
              <PayslipDocument payslip={previewPayslip} />
            </div>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card p-10 text-center text-muted text-sm">
          No payslip templates yet -- create one and keep it default before generating payslips.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onMakeDefault={() => makeDefault(t)} onEdit={() => startEdit(t)} />
          ))}
        </div>
      )}
    </div>
  );
}
