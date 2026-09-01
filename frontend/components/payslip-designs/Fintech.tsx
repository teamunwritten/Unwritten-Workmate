import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerDetailsLine, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function FintechDesign({ payslip }: { payslip: Payslip }) {
  const { companyName, logoDataUrl } = companyBranding(payslip.header_config);
  const employerLine = employerDetailsLine(payslip.header_config);

  return (
    <div className="bg-white text-[#0f1720] px-9 py-8 print:px-0 print:py-0">
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2.5">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="" className="h-8 w-8 rounded-lg object-contain border border-[#e3e7ec]" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-[#059669] text-white flex items-center justify-center text-[11px] font-bold">
              {companyName.slice(0, 1)}
            </div>
          )}
          <span className="text-[14px] font-semibold">{companyName}</span>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
            payslip.status === "APPROVED" ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#fffbeb] text-[#b45309]"
          }`}
        >
          {payslip.status === "APPROVED" ? "● Paid" : "● Pending"}
        </span>
      </div>

      <div className="border border-[#e3e7ec] rounded-xl p-5 mb-5">
        <div className="text-[11px] text-[#64748b]">
          Payslip for {MONTHS[payslip.period_month - 1]} {payslip.period_year}
        </div>
        <div className="text-[30px] font-bold tabular-nums mt-1">{formatCurrency(payslip.net_pay)}</div>
        <div className="text-[11px] text-[#94a3b8] mt-1">
          Paid to {payslip.employee_name} · {payslip.reference_number}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="border border-[#e3e7ec] rounded-lg p-3">
          <div className="text-[9.5px] uppercase tracking-wide text-[#94a3b8]">Employee</div>
          <div className="text-[12.5px] font-medium mt-0.5">
            {payslip.employee_name} ({payslip.employee_code})
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">{payslip.position || "—"}</div>
        </div>
        <div className="border border-[#e3e7ec] rounded-lg p-3">
          <div className="text-[9.5px] uppercase tracking-wide text-[#94a3b8]">Department</div>
          <div className="text-[12.5px] font-medium mt-0.5">{payslip.department_name || "—"}</div>
          <div className="text-[11px] text-[#64748b] mt-0.5">{formatDate(payslip.approved_at || payslip.generated_at)}</div>
        </div>
      </div>

      <div className="border border-[#e3e7ec] rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-2.5 bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-wide text-[#64748b] border-b border-[#e3e7ec]">
          Transaction breakdown
        </div>
        {payslip.line_items.map((item, i) => (
          <div
            key={item.component_code}
            className={`flex items-center justify-between px-4 py-2.5 text-[12.5px] ${i > 0 ? "border-t border-[#f1f5f9]" : ""}`}
          >
            <span className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${item.component_type === "EARNING" ? "bg-[#059669]" : "bg-[#dc2626]"}`} />
              {item.component_name}
            </span>
            <span className={`tabular-nums font-medium ${item.component_type === "DEDUCTION" ? "text-[#dc2626]" : "text-[#0f1720]"}`}>
              {item.component_type === "DEDUCTION" ? "−" : "+"} {formatCurrency(item.value)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 bg-[#f8fafc] border-t border-[#e3e7ec] font-semibold text-[13px]">
          <span>Net Pay</span>
          <span className="tabular-nums">{formatCurrency(payslip.net_pay)}</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] text-[#94a3b8] leading-relaxed">
          Computer-generated statement, no signature required. Tax and statutory deductions are not yet calculated.
        </p>
        {payslip.footer_note && <p className="text-[10px] text-[#64748b]">{payslip.footer_note}</p>}
        {employerLine && <p className="text-[9.5px] text-[#94a3b8]">{employerLine}</p>}
      </div>
    </div>
  );
}
