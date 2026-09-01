import { Payslip } from "@/lib/types";
import { MONTHS, amountInWords, companyBranding, employerFooterLines, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function ModernDesign({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.line_items.filter((i) => i.component_type === "EARNING");
  const deductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION");
  const totalDeductions = deductions.reduce((sum, i) => sum + i.value, 0);
  const { companyName, companyTagline, companyInitials, logoDataUrl } = companyBranding(payslip.header_config);
  const employerFooter = employerFooterLines(payslip.header_config);

  return (
    <div className="bg-white text-[#1a1a1a] rounded-2xl border border-[#e7e9ee] shadow-md overflow-hidden print:border print:shadow-none print:rounded-none">
      <div
        className="px-9 pt-8 pb-7 text-white"
        style={{ background: "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="" className="h-11 w-11 rounded-xl object-contain bg-white/15 backdrop-blur shrink-0" />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-sm font-bold shrink-0">
                {companyInitials}
              </div>
            )}
            <div>
              <div className="text-[16px] font-semibold tracking-tight">{companyName}</div>
              <div className="text-[11.5px] text-white/70">{companyTagline}</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/15">
            {payslip.status === "APPROVED" ? "Approved" : "Draft"}
          </span>
        </div>
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/60">
            Payslip · {MONTHS[payslip.period_month - 1]} {payslip.period_year} · {payslip.reference_number}
          </div>
          <div className="text-[26px] font-bold mt-1">{formatCurrency(payslip.net_pay)}</div>
          <div className="text-[11.5px] text-white/70">Net Pay for {payslip.employee_name}</div>
          <div className="text-[9.5px] text-white/50 italic mt-1">{amountInWords(payslip.net_pay)}</div>
        </div>
      </div>

      <div className="px-9 py-6 grid grid-cols-4 gap-3 -mt-1">
        {[
          { label: "Employee ID", value: payslip.employee_code },
          { label: "Designation", value: payslip.position || "—" },
          { label: "Department", value: payslip.department_name || "—" },
          { label: payslip.status === "APPROVED" ? "Approved" : "Generated", value: formatDate(payslip.approved_at || payslip.generated_at) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-[#f7f7fb] px-3.5 py-3">
            <div className="text-[10px] uppercase tracking-wide text-[#8b8fa3]">{item.label}</div>
            <div className="text-[13px] font-semibold text-[#111827] mt-0.5 truncate">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="px-9 pb-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6d28d9] mb-2">Earnings</div>
          <div className="space-y-1.5">
            {earnings.map((item) => (
              <div key={item.component_code} className="flex justify-between text-[12.5px] py-1">
                <span className="text-[#4b5563]">{item.component_name}</span>
                <span className="font-medium text-[#111827] tabular-nums">{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-[12.5px] pt-2 mt-1 border-t border-[#eceef3] font-semibold">
              <span>Gross</span>
              <span className="tabular-nums">{formatCurrency(payslip.gross_pay)}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#c026d3] mb-2">Deductions</div>
          <div className="space-y-1.5">
            {deductions.map((item) => (
              <div key={item.component_code} className="flex justify-between text-[12.5px] py-1">
                <span className="text-[#4b5563]">{item.component_name}</span>
                <span className="font-medium text-[#111827] tabular-nums">{formatCurrency(item.value)}</span>
              </div>
            ))}
            {deductions.length === 0 && <div className="text-[12.5px] text-[#9ca3af]">No deductions</div>}
            <div className="flex justify-between text-[12.5px] pt-2 mt-1 border-t border-[#eceef3] font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-9 pb-7 pt-2 space-y-1.5">
        <p className="text-[10.5px] text-[#9ca3af] leading-relaxed">
          This is a computer-generated payslip and does not require a signature. Net pay reflects configured salary
          components only — tax and statutory deductions (TDS, PF, ESI, Professional Tax) are not yet calculated.
        </p>
        {payslip.approved_by_name && <p className="text-[10.5px] text-[#9ca3af]">Approved by {payslip.approved_by_name}.</p>}
        {payslip.footer_note && <p className="text-[10.5px] text-[#6b7280]">{payslip.footer_note}</p>}
        {employerFooter.legal && <p className="text-[10px] text-[#9ca3af]">{employerFooter.legal}</p>}
        {employerFooter.contact && <p className="text-[9.5px] text-[#9ca3af]">{employerFooter.contact}</p>}
      </div>
    </div>
  );
}
