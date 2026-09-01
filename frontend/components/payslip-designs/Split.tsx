import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerDetailsLine, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function SplitDesign({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.line_items.filter((i) => i.component_type === "EARNING");
  const deductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION");
  const totalDeductions = deductions.reduce((sum, i) => sum + i.value, 0);
  const { companyName, companyTagline, companyInitials, logoDataUrl } = companyBranding(payslip.header_config);
  const employerLine = employerDetailsLine(payslip.header_config);

  return (
    <div className="bg-white text-[#1a1a1a] flex print:border">
      <div className="w-[38%] bg-[#0c1e3d] text-white px-6 py-8 flex flex-col">
        {logoDataUrl ? (
          <img src={logoDataUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/10" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-[13px] font-bold">
            {companyInitials}
          </div>
        )}
        <div className="mt-3">
          <div className="text-[14px] font-semibold leading-tight">{companyName}</div>
          <div className="text-[10.5px] text-white/50 mt-0.5">{companyTagline}</div>
        </div>

        <div className="mt-8 space-y-4 text-[11.5px]">
          <div>
            <div className="text-[9.5px] uppercase tracking-wide text-white/40">Employee</div>
            <div className="font-medium mt-0.5">{payslip.employee_name}</div>
            <div className="text-white/60 mt-0.5">{payslip.employee_code}</div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-wide text-white/40">Designation</div>
            <div className="font-medium mt-0.5">{payslip.position || "—"}</div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-wide text-white/40">Department</div>
            <div className="font-medium mt-0.5">{payslip.department_name || "—"}</div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-wide text-white/40">Pay Period</div>
            <div className="font-medium mt-0.5">
              {MONTHS[payslip.period_month - 1]} {payslip.period_year}
            </div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-wide text-white/40">{payslip.status === "APPROVED" ? "Approved" : "Generated"}</div>
            <div className="font-medium mt-0.5">{formatDate(payslip.approved_at || payslip.generated_at)}</div>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
              payslip.status === "APPROVED" ? "bg-[#10b981]/20 text-[#6ee7b7]" : "bg-white/10 text-white/70"
            }`}
          >
            {payslip.status === "APPROVED" ? "Approved" : "Draft"}
          </span>
          <div className="text-[9.5px] text-white/30 mt-3">{payslip.reference_number}</div>
        </div>
      </div>

      <div className="w-[62%] px-8 py-8">
        <div className="text-[11px] uppercase tracking-[0.12em] text-[#94a3b8]">Payslip</div>
        <div className="text-[18px] font-semibold mt-0.5">
          {MONTHS[payslip.period_month - 1]} {payslip.period_year}
        </div>

        <table className="w-full text-[12.5px] mt-6">
          <thead>
            <tr className="text-left text-[#94a3b8] border-b border-[#e5e7eb]">
              <th className="font-medium pb-2">Component</th>
              <th className="font-medium pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((item) => (
              <tr key={item.component_code} className="border-b border-[#f1f5f9]">
                <td className="py-2 text-[#374151]">{item.component_name}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(item.value)}</td>
              </tr>
            ))}
            <tr className="border-b border-[#e5e7eb] font-semibold">
              <td className="py-2">Gross</td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(payslip.gross_pay)}</td>
            </tr>
            {deductions.map((item) => (
              <tr key={item.component_code} className="border-b border-[#f1f5f9]">
                <td className="py-2 text-[#374151]">{item.component_name}</td>
                <td className="py-2 text-right tabular-nums text-[#dc2626]">− {formatCurrency(item.value)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total Deductions</td>
              <td className="py-2 text-right tabular-nums text-[#dc2626]">− {formatCurrency(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between rounded-lg bg-[#f8fafc] border border-[#e5e7eb] px-5 py-3.5">
          <span className="text-[12.5px] font-semibold text-[#0c1e3d]">Net Pay</span>
          <span className="text-[19px] font-bold tabular-nums text-[#0c1e3d]">{formatCurrency(payslip.net_pay)}</span>
        </div>

        <div className="mt-6 space-y-1">
          <p className="text-[10px] text-[#9ca3af] leading-relaxed">
            Computer-generated, no signature required. Tax and statutory deductions are not yet calculated.
          </p>
          {payslip.footer_note && <p className="text-[10px] text-[#6b7280]">{payslip.footer_note}</p>}
          {employerLine && <p className="text-[9.5px] text-[#9ca3af]">{employerLine}</p>}
        </div>
      </div>
    </div>
  );
}
