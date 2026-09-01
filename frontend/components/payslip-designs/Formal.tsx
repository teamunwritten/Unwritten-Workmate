import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerFooterLines, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function FormalDesign({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.line_items.filter((i) => i.component_type === "EARNING");
  const deductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION");
  const totalDeductions = deductions.reduce((sum, i) => sum + i.value, 0);
  const rowCount = Math.max(earnings.length, deductions.length);
  const { companyName, companyTagline, logoDataUrl } = companyBranding(payslip.header_config);
  const employerFooter = employerFooterLines(payslip.header_config);

  return (
    <div className="bg-white text-[#1a1a1a] font-serif p-3 print:p-0">
      <div className="border-2 border-[#1a1a1a] p-8">
        <div className="text-center border-b-2 border-[#1a1a1a] pb-5 mb-5">
          {logoDataUrl && <img src={logoDataUrl} alt="" className="h-10 mx-auto mb-2 object-contain" />}
          <div className="text-[18px] font-bold uppercase tracking-[0.08em]">{companyName}</div>
          {companyTagline && <div className="text-[11.5px] italic text-[#4b5563] mt-0.5">{companyTagline}</div>}
          <div className="text-[13px] uppercase tracking-[0.25em] mt-4">Salary Statement</div>
          <div className="text-[12px] text-[#4b5563] mt-1">
            For the month of {MONTHS[payslip.period_month - 1]} {payslip.period_year}
          </div>
          <div className="text-[10.5px] text-[#6b7280] mt-1">Ref: {payslip.reference_number}</div>
        </div>

        <table className="w-full text-[12.5px] mb-6">
          <tbody>
            <tr>
              <td className="py-1 pr-2 text-[#4b5563] w-[15%]">Employee Name</td>
              <td className="py-1 font-semibold w-[35%]">{payslip.employee_name}</td>
              <td className="py-1 pr-2 text-[#4b5563] w-[15%]">Employee ID</td>
              <td className="py-1 font-semibold w-[35%]">{payslip.employee_code}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 text-[#4b5563]">Designation</td>
              <td className="py-1 font-semibold">{payslip.position || "—"}</td>
              <td className="py-1 pr-2 text-[#4b5563]">Department</td>
              <td className="py-1 font-semibold">{payslip.department_name || "—"}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 text-[#4b5563]">Status</td>
              <td className="py-1 font-semibold">{payslip.status === "APPROVED" ? "Approved" : "Draft"}</td>
              <td className="py-1 pr-2 text-[#4b5563]">Date</td>
              <td className="py-1 font-semibold">{formatDate(payslip.approved_at || payslip.generated_at)}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-[12.5px] border-collapse mb-2">
          <thead>
            <tr>
              <th className="text-left font-semibold border border-[#1a1a1a] px-3 py-1.5 w-[27%]">Earnings</th>
              <th className="text-right font-semibold border border-[#1a1a1a] px-3 py-1.5 w-[23%]">Amount (₹)</th>
              <th className="text-left font-semibold border border-[#1a1a1a] px-3 py-1.5 w-[27%]">Deductions</th>
              <th className="text-right font-semibold border border-[#1a1a1a] px-3 py-1.5 w-[23%]">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(rowCount, 1) }).map((_, i) => (
              <tr key={i}>
                <td className="border border-[#1a1a1a] px-3 py-1">{earnings[i]?.component_name ?? ""}</td>
                <td className="border border-[#1a1a1a] px-3 py-1 text-right tabular-nums">
                  {earnings[i] ? earnings[i].value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                </td>
                <td className="border border-[#1a1a1a] px-3 py-1">{deductions[i]?.component_name ?? ""}</td>
                <td className="border border-[#1a1a1a] px-3 py-1 text-right tabular-nums">
                  {deductions[i] ? deductions[i].value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="border border-[#1a1a1a] px-3 py-1.5">Gross Total</td>
              <td className="border border-[#1a1a1a] px-3 py-1.5 text-right tabular-nums">
                {payslip.gross_pay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td className="border border-[#1a1a1a] px-3 py-1.5">Deduction Total</td>
              <td className="border border-[#1a1a1a] px-3 py-1.5 text-right tabular-nums">
                {totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="text-right text-[14px] font-bold py-3">Net Pay: {formatCurrency(payslip.net_pay)}</div>

        <div className="flex justify-between items-end mt-16 text-[11.5px]">
          <div>
            <p className="leading-relaxed text-[10.5px] italic text-[#4b5563] max-w-xs">
              This is a computer-generated statement and does not require a physical signature. Net pay reflects
              configured salary components only.
            </p>
            {payslip.footer_note && <p className="text-[10.5px] italic text-[#4b5563] mt-1">{payslip.footer_note}</p>}
            {employerFooter.legal && <p className="text-[10px] not-italic text-[#6b7280] mt-1 max-w-xs">{employerFooter.legal}</p>}
            {employerFooter.contact && <p className="text-[9.5px] not-italic text-[#9ca3af] max-w-xs">{employerFooter.contact}</p>}
          </div>
          <div className="text-center">
            <div className="border-t border-[#1a1a1a] w-40 pt-1">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
