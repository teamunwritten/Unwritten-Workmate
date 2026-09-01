import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerDetailsLine, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function ClassicDesign({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.line_items.filter((i) => i.component_type === "EARNING");
  const deductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION");
  const totalDeductions = deductions.reduce((sum, i) => sum + i.value, 0);
  const rowCount = Math.max(earnings.length, deductions.length);
  const { companyName, companyTagline, companyInitials, logoDataUrl } = companyBranding(payslip.header_config);
  const employerLine = employerDetailsLine(payslip.header_config);

  return (
    <div className="bg-white text-[#1a1a1a] border border-[#d8dce3] shadow-sm print:border-0 print:shadow-none">
      <div className="flex items-start justify-between px-10 pt-9 pb-6 border-b-2 border-[#0b3d91]">
        <div className="flex items-center gap-3">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="" className="h-11 w-11 rounded-md object-contain shrink-0" />
          ) : (
            <div className="h-11 w-11 rounded-md bg-[#0b3d91] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {companyInitials}
            </div>
          )}
          <div>
            <div className="text-[16px] font-semibold tracking-tight text-[#111827]">{companyName}</div>
            <div className="text-[11.5px] text-[#6b7280]">{companyTagline}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Payslip</div>
          <div className="text-[15px] font-semibold text-[#111827] mt-0.5">
            {MONTHS[payslip.period_month - 1]} {payslip.period_year}
          </div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5">{payslip.reference_number}</div>
          <span
            className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
              payslip.status === "APPROVED" ? "bg-[#e6f4ea] text-[#17874a]" : "bg-[#fef3e7] text-[#92400e]"
            }`}
          >
            {payslip.status === "APPROVED" ? "Approved" : "Draft"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-10 py-6 border-b border-[#e5e7eb] text-[12.5px]">
        <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
          <span className="text-[#6b7280]">Employee Name</span>
          <span className="font-medium text-[#111827]">{payslip.employee_name}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
          <span className="text-[#6b7280]">Employee ID</span>
          <span className="font-medium text-[#111827]">{payslip.employee_code}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
          <span className="text-[#6b7280]">Designation</span>
          <span className="font-medium text-[#111827]">{payslip.position || "—"}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
          <span className="text-[#6b7280]">Department</span>
          <span className="font-medium text-[#111827]">{payslip.department_name || "—"}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
          <span className="text-[#6b7280]">Pay Period</span>
          <span className="font-medium text-[#111827]">
            {MONTHS[payslip.period_month - 1]} {payslip.period_year}
          </span>
        </div>
        <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
          <span className="text-[#6b7280]">{payslip.status === "APPROVED" ? "Approved On" : "Generated On"}</span>
          <span className="font-medium text-[#111827]">{formatDate(payslip.approved_at || payslip.generated_at)}</span>
        </div>
      </div>

      <div className="px-10 py-6">
        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr className="bg-[#f3f5f9]">
              <th className="text-left font-semibold text-[#374151] px-3 py-2 border border-[#e5e7eb] w-[27%]">Earnings</th>
              <th className="text-right font-semibold text-[#374151] px-3 py-2 border border-[#e5e7eb] w-[23%]">Amount</th>
              <th className="text-left font-semibold text-[#374151] px-3 py-2 border border-[#e5e7eb] w-[27%]">Deductions</th>
              <th className="text-right font-semibold text-[#374151] px-3 py-2 border border-[#e5e7eb] w-[23%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(rowCount, 1) }).map((_, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5 border border-[#e5e7eb] text-[#374151]">{earnings[i]?.component_name ?? ""}</td>
                <td className="px-3 py-1.5 border border-[#e5e7eb] text-right tabular-nums text-[#111827]">
                  {earnings[i] ? formatCurrency(earnings[i].value) : ""}
                </td>
                <td className="px-3 py-1.5 border border-[#e5e7eb] text-[#374151]">{deductions[i]?.component_name ?? ""}</td>
                <td className="px-3 py-1.5 border border-[#e5e7eb] text-right tabular-nums text-[#111827]">
                  {deductions[i] ? formatCurrency(deductions[i].value) : ""}
                </td>
              </tr>
            ))}
            <tr className="bg-[#f9fafb] font-semibold">
              <td className="px-3 py-2 border border-[#e5e7eb] text-[#111827]">Gross Earnings</td>
              <td className="px-3 py-2 border border-[#e5e7eb] text-right tabular-nums text-[#111827]">
                {formatCurrency(payslip.gross_pay)}
              </td>
              <td className="px-3 py-2 border border-[#e5e7eb] text-[#111827]">Total Deductions</td>
              <td className="px-3 py-2 border border-[#e5e7eb] text-right tabular-nums text-[#111827]">
                {formatCurrency(totalDeductions)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between rounded-md bg-[#0b3d91] px-5 py-3.5">
          <span className="text-[13px] font-semibold text-white tracking-wide">Net Pay</span>
          <span className="text-[17px] font-bold text-white tabular-nums">{formatCurrency(payslip.net_pay)}</span>
        </div>
      </div>

      <div className="px-10 pb-8 pt-2 space-y-1.5">
        <p className="text-[10.5px] text-[#9ca3af] leading-relaxed">
          This is a computer-generated payslip and does not require a signature. Net pay reflects configured salary
          components only — tax and statutory deductions (TDS, PF, ESI, Professional Tax) are not yet calculated.
        </p>
        {payslip.approved_by_name && (
          <p className="text-[10.5px] text-[#9ca3af]">Approved by {payslip.approved_by_name}.</p>
        )}
        {payslip.footer_note && <p className="text-[10.5px] text-[#6b7280] pt-1">{payslip.footer_note}</p>}
        {employerLine && <p className="text-[10px] text-[#9ca3af] pt-1">{employerLine}</p>}
      </div>
    </div>
  );
}
