import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerDetailsLine, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function BoldDesign({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.line_items.filter((i) => i.component_type === "EARNING");
  const deductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION");
  const totalDeductions = deductions.reduce((sum, i) => sum + i.value, 0);
  const { companyName, companyTagline, logoDataUrl } = companyBranding(payslip.header_config);
  const employerLine = employerDetailsLine(payslip.header_config);

  return (
    <div className="bg-white text-[#1a1a1a] overflow-hidden print:border">
      <div className="bg-[#0f172a] text-white px-9 py-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoDataUrl && <img src={logoDataUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/10" />}
          <div>
            <div className="text-[19px] font-extrabold tracking-tight">{companyName}</div>
            <div className="text-[11.5px] text-white/50">{companyTagline}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#38bdf8]">Payslip</div>
          <div className="text-[14px] font-semibold">
            {MONTHS[payslip.period_month - 1]} {payslip.period_year}
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">{payslip.reference_number}</div>
        </div>
      </div>

      <div className="px-9 py-6 bg-[#f8fafc] border-b border-[#e2e8f0]">
        <div className="text-[12px] text-[#64748b]">{payslip.employee_name}</div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-[32px] font-extrabold tracking-tight text-[#0f172a] tabular-nums">
            {formatCurrency(payslip.net_pay)}
          </span>
          <span className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide">Net Pay</span>
        </div>
        <div className="flex gap-6 mt-3 text-[11.5px] text-[#64748b]">
          <span>
            {payslip.employee_code} · {payslip.position || "—"}
          </span>
          <span>{payslip.department_name || "—"}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              payslip.status === "APPROVED" ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fef3c7] text-[#92400e]"
            }`}
          >
            {payslip.status === "APPROVED" ? "Approved" : "Draft"}
          </span>
        </div>
      </div>

      <div className="px-9 py-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#e2e8f0] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#16a34a]">Gross</div>
          <div className="text-[18px] font-bold tabular-nums mt-1">{formatCurrency(payslip.gross_pay)}</div>
        </div>
        <div className="rounded-xl border border-[#e2e8f0] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#dc2626]">Deductions</div>
          <div className="text-[18px] font-bold tabular-nums mt-1">{formatCurrency(totalDeductions)}</div>
        </div>
        <div className="rounded-xl bg-[#0f172a] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#38bdf8]">Net</div>
          <div className="text-[18px] font-bold tabular-nums mt-1 text-white">{formatCurrency(payslip.net_pay)}</div>
        </div>
      </div>

      <div className="px-9 pb-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#16a34a] mb-2">Earnings</div>
          {earnings.map((item) => (
            <div key={item.component_code} className="flex justify-between text-[12.5px] py-1 border-b border-[#f1f5f9]">
              <span className="text-[#475569]">{item.component_name}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#dc2626] mb-2">Deductions</div>
          {deductions.map((item) => (
            <div key={item.component_code} className="flex justify-between text-[12.5px] py-1 border-b border-[#f1f5f9]">
              <span className="text-[#475569]">{item.component_name}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(item.value)}</span>
            </div>
          ))}
          {deductions.length === 0 && <div className="text-[12.5px] text-[#94a3b8]">None</div>}
        </div>
      </div>

      <div className="px-9 pb-7 pt-1 space-y-1.5">
        <p className="text-[10.5px] text-[#94a3b8] leading-relaxed">
          Computer-generated · {payslip.status === "APPROVED" ? `Approved ${formatDate(payslip.approved_at || payslip.generated_at)}` : "Draft"} ·
          No signature required. Tax and statutory deductions are not yet calculated.
        </p>
        {payslip.footer_note && <p className="text-[10.5px] text-[#64748b]">{payslip.footer_note}</p>}
        {employerLine && <p className="text-[10px] text-[#94a3b8]">{employerLine}</p>}
      </div>
    </div>
  );
}
