import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerFooterLines, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function ElegantDesign({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.line_items.filter((i) => i.component_type === "EARNING");
  const deductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION");
  const totalDeductions = deductions.reduce((sum, i) => sum + i.value, 0);
  const { companyName, companyTagline, logoDataUrl } = companyBranding(payslip.header_config);
  const employerFooter = employerFooterLines(payslip.header_config);

  return (
    <div className="bg-white text-[#26241f] px-12 py-11 print:px-0 print:py-0">
      <div className="text-center pb-7 border-b border-[#26241f]">
        {logoDataUrl && <img src={logoDataUrl} alt="" className="h-9 mx-auto mb-3 object-contain" />}
        <div className="text-[15px] tracking-[0.3em] uppercase font-medium">{companyName}</div>
        {companyTagline && <div className="text-[10.5px] tracking-[0.15em] uppercase text-[#a39c8c] mt-1.5">{companyTagline}</div>}
      </div>

      <div className="text-center py-6">
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#a39c8c]">Statement of Earnings</div>
        <div className="text-[17px] font-serif italic mt-1">
          {MONTHS[payslip.period_month - 1]} {payslip.period_year}
        </div>
        <div className="text-[10px] tracking-[0.1em] text-[#a39c8c] mt-1">{payslip.reference_number}</div>
      </div>

      <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[12px] py-6 border-t border-b border-[#e7e3d9]">
        <div className="flex justify-between">
          <span className="uppercase tracking-[0.1em] text-[10px] text-[#a39c8c] self-center">Employee</span>
          <span className="font-medium">{payslip.employee_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="uppercase tracking-[0.1em] text-[10px] text-[#a39c8c] self-center">Employee ID</span>
          <span className="font-medium">{payslip.employee_code}</span>
        </div>
        <div className="flex justify-between">
          <span className="uppercase tracking-[0.1em] text-[10px] text-[#a39c8c] self-center">Designation</span>
          <span className="font-medium">{payslip.position || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="uppercase tracking-[0.1em] text-[10px] text-[#a39c8c] self-center">Department</span>
          <span className="font-medium">{payslip.department_name || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="uppercase tracking-[0.1em] text-[10px] text-[#a39c8c] self-center">Status</span>
          <span className="font-medium">{payslip.status === "APPROVED" ? "Approved" : "Draft"}</span>
        </div>
        <div className="flex justify-between">
          <span className="uppercase tracking-[0.1em] text-[10px] text-[#a39c8c] self-center">Date</span>
          <span className="font-medium">{formatDate(payslip.approved_at || payslip.generated_at)}</span>
        </div>
      </div>

      <div className="py-7">
        <table className="w-full text-[12.5px]">
          <tbody>
            {earnings.map((item) => (
              <tr key={item.component_code}>
                <td className="py-2 text-[#57534a]">{item.component_name}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(item.value)}</td>
              </tr>
            ))}
            <tr className="border-t border-[#e7e3d9]">
              <td className="py-2 font-medium uppercase text-[10.5px] tracking-[0.1em] text-[#a39c8c]">Gross Earnings</td>
              <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(payslip.gross_pay)}</td>
            </tr>
            {deductions.map((item) => (
              <tr key={item.component_code}>
                <td className="py-2 text-[#57534a]">{item.component_name}</td>
                <td className="py-2 text-right tabular-nums">− {formatCurrency(item.value)}</td>
              </tr>
            ))}
            <tr className="border-t border-[#e7e3d9]">
              <td className="py-2 font-medium uppercase text-[10.5px] tracking-[0.1em] text-[#a39c8c]">Total Deductions</td>
              <td className="py-2 text-right font-medium tabular-nums">− {formatCurrency(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 border border-[#26241f] px-6 py-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em]">Net Pay</span>
          <span className="text-[22px] font-serif tabular-nums">{formatCurrency(payslip.net_pay)}</span>
        </div>
      </div>

      <div className="text-center space-y-1 pt-2">
        <p className="text-[10px] text-[#a39c8c] leading-relaxed max-w-md mx-auto">
          Computer-generated and does not require a signature. Net pay reflects configured salary components only.
        </p>
        {payslip.footer_note && <p className="text-[10px] text-[#a39c8c]">{payslip.footer_note}</p>}
        {employerFooter.legal && <p className="text-[9.5px] text-[#c2bcae]">{employerFooter.legal}</p>}
        {employerFooter.contact && <p className="text-[9px] text-[#c2bcae]">{employerFooter.contact}</p>}
      </div>
    </div>
  );
}
