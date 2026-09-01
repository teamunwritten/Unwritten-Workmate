import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerDetailsLine, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function ExecutiveDesign({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.line_items.filter((i) => i.component_type === "EARNING");
  const deductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION");
  const totalDeductions = deductions.reduce((sum, i) => sum + i.value, 0);
  const { companyName, companyTagline, companyInitials, logoDataUrl } = companyBranding(payslip.header_config);
  const employerLine = employerDetailsLine(payslip.header_config);

  const netPct = payslip.gross_pay > 0 ? Math.max(0, Math.min(100, (payslip.net_pay / payslip.gross_pay) * 100)) : 0;
  const deductPct = 100 - netPct;

  return (
    <div className="bg-white text-[#111827] px-9 py-8 print:px-0 print:py-0">
      <div className="flex items-center justify-between pb-6 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="" className="h-10 w-10 rounded-full object-contain border border-[#e5e7eb]" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#111827] text-white flex items-center justify-center text-[12px] font-bold">
              {companyInitials}
            </div>
          )}
          <div>
            <div className="text-[15px] font-semibold">{companyName}</div>
            <div className="text-[11px] text-[#9ca3af]">{companyTagline}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[#9ca3af]">Payroll Summary</div>
          <div className="text-[13px] font-semibold">
            {MONTHS[payslip.period_month - 1]} {payslip.period_year}
          </div>
          <div className="text-[10px] text-[#c1c6cf]">{payslip.reference_number}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-6">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9ca3af]">Employee</div>
          <div className="text-[13px] font-semibold mt-0.5">{payslip.employee_name}</div>
          <div className="text-[11px] text-[#6b7280]">{payslip.employee_code}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9ca3af]">Role</div>
          <div className="text-[13px] font-semibold mt-0.5">{payslip.position || "—"}</div>
          <div className="text-[11px] text-[#6b7280]">{payslip.department_name || "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9ca3af]">
            {payslip.status === "APPROVED" ? "Approved" : "Generated"}
          </div>
          <div className="text-[13px] font-semibold mt-0.5">{formatDate(payslip.approved_at || payslip.generated_at)}</div>
          <span
            className={`inline-block mt-0.5 text-[10px] font-semibold uppercase ${
              payslip.status === "APPROVED" ? "text-[#16a34a]" : "text-[#d97706]"
            }`}
          >
            {payslip.status === "APPROVED" ? "Approved" : "Draft"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[11px] uppercase tracking-wide text-[#9ca3af]">Gross to Net</span>
          <span className="text-[24px] font-bold tabular-nums">{formatCurrency(payslip.net_pay)}</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden bg-[#f1f5f9] flex">
          <div className="h-full bg-[#111827]" style={{ width: `${netPct}%` }} />
          <div className="h-full bg-[#e5e7eb]" style={{ width: `${deductPct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#374151]">
            <span className="h-2 w-2 rounded-full bg-[#111827] inline-block" /> Net {formatCurrency(payslip.net_pay)} ({netPct.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5 text-[#9ca3af]">
            <span className="h-2 w-2 rounded-full bg-[#e5e7eb] inline-block" /> Deductions {formatCurrency(totalDeductions)} ({deductPct.toFixed(0)}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#111827] mb-2">Earnings</div>
          {earnings.map((item) => (
            <div key={item.component_code} className="flex justify-between text-[12.5px] py-1.5 border-b border-[#f1f5f9]">
              <span className="text-[#4b5563]">{item.component_name}</span>
              <span className="tabular-nums font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[12.5px] py-1.5 font-semibold">
            <span>Gross</span>
            <span className="tabular-nums">{formatCurrency(payslip.gross_pay)}</span>
          </div>
        </div>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9ca3af] mb-2">Deductions</div>
          {deductions.map((item) => (
            <div key={item.component_code} className="flex justify-between text-[12.5px] py-1.5 border-b border-[#f1f5f9]">
              <span className="text-[#4b5563]">{item.component_name}</span>
              <span className="tabular-nums font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
          {deductions.length === 0 && <div className="text-[12.5px] text-[#9ca3af] py-1.5">None</div>}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#e5e7eb] space-y-1">
        <p className="text-[10px] text-[#9ca3af] leading-relaxed">
          Computer-generated, no signature required. Tax and statutory deductions are not yet calculated.
        </p>
        {payslip.footer_note && <p className="text-[10px] text-[#6b7280]">{payslip.footer_note}</p>}
        {employerLine && <p className="text-[9.5px] text-[#c1c6cf]">{employerLine}</p>}
      </div>
    </div>
  );
}
