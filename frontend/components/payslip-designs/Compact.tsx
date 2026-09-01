import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerDetailsLine, formatCurrency } from "@/lib/payslipFormat";

export default function CompactDesign({ payslip }: { payslip: Payslip }) {
  const { companyName, logoDataUrl } = companyBranding(payslip.header_config);
  const employerLine = employerDetailsLine(payslip.header_config);

  return (
    <div className="bg-white text-[#1a1a1a] border border-[#d8dce3] text-[11px] leading-tight print:border-0">
      <div className="flex items-center justify-between px-4 py-2 bg-[#f3f5f9] border-b border-[#d8dce3]">
        <span className="font-semibold flex items-center gap-1.5">
          {logoDataUrl && <img src={logoDataUrl} alt="" className="h-4 w-4 object-contain" />}
          {companyName}
        </span>
        <span className="text-[#6b7280]">
          Payslip · {MONTHS[payslip.period_month - 1]} {payslip.period_year} · {payslip.reference_number}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
            payslip.status === "APPROVED" ? "bg-[#e6f4ea] text-[#17874a]" : "bg-[#fef3e7] text-[#92400e]"
          }`}
        >
          {payslip.status === "APPROVED" ? "Approved" : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-x-3 px-4 py-2 border-b border-[#d8dce3] text-[10.5px]">
        <div>
          <span className="text-[#9ca3af]">Name </span>
          <span className="font-medium">{payslip.employee_name}</span>
        </div>
        <div>
          <span className="text-[#9ca3af]">ID </span>
          <span className="font-medium">{payslip.employee_code}</span>
        </div>
        <div>
          <span className="text-[#9ca3af]">Designation </span>
          <span className="font-medium">{payslip.position || "—"}</span>
        </div>
        <div>
          <span className="text-[#9ca3af]">Dept </span>
          <span className="font-medium">{payslip.department_name || "—"}</span>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-[#d8dce3] text-[#6b7280]">
            <th className="text-left font-medium px-4 py-1.5 w-[45%]">Component</th>
            <th className="text-left font-medium py-1.5 w-[20%]">Type</th>
            <th className="text-right font-medium px-4 py-1.5 w-[35%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payslip.line_items.map((item, i) => (
            <tr key={item.component_code} className={i % 2 === 1 ? "bg-[#fafafa]" : ""}>
              <td className="px-4 py-1">{item.component_name}</td>
              <td className="py-1 text-[#6b7280]">{item.component_type === "EARNING" ? "Earning" : "Deduction"}</td>
              <td className="px-4 py-1 text-right tabular-nums">
                {item.component_type === "DEDUCTION" ? "-" : ""}
                {formatCurrency(item.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center px-4 py-2 border-t-2 border-[#1a1a1a] font-semibold">
        <span>Net Pay</span>
        <span className="tabular-nums text-[13px]">{formatCurrency(payslip.net_pay)}</span>
      </div>

      {payslip.footer_note && <div className="px-4 pb-1 text-[9.5px] text-[#9ca3af]">{payslip.footer_note}</div>}
      {employerLine && <div className="px-4 pb-2 text-[9px] text-[#9ca3af]">{employerLine}</div>}
    </div>
  );
}
