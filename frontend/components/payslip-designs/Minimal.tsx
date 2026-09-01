import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerFooterLines, formatCurrency, formatDate } from "@/lib/payslipFormat";

export default function MinimalDesign({ payslip }: { payslip: Payslip }) {
  const { companyName, companyTagline, logoDataUrl } = companyBranding(payslip.header_config);
  const employerFooter = employerFooterLines(payslip.header_config);

  return (
    <div className="bg-white text-[#1f2328] px-14 py-12 print:px-0 print:py-0">
      <div className="text-center mb-10">
        {logoDataUrl && <img src={logoDataUrl} alt="" className="h-10 mx-auto mb-2 object-contain" />}
        <div className="text-[13px] font-medium tracking-[0.2em] uppercase text-[#9aa0aa]">{companyName}</div>
        {companyTagline && <div className="text-[11px] text-[#c1c6cf] mt-0.5">{companyTagline}</div>}
        <div className="text-[22px] font-light tracking-tight mt-5">Payslip</div>
        <div className="text-[13px] text-[#9aa0aa] mt-1">
          {MONTHS[payslip.period_month - 1]} {payslip.period_year}
        </div>
        <div className="text-[10.5px] text-[#c1c6cf] mt-1">{payslip.reference_number}</div>
      </div>

      <div className="flex justify-between text-[13px] py-5 border-t border-b border-[#eceef1]">
        <div>
          <div className="font-medium">{payslip.employee_name}</div>
          <div className="text-[#9aa0aa] mt-0.5">
            {payslip.employee_code} {payslip.position ? `· ${payslip.position}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#9aa0aa]">{payslip.department_name || "—"}</div>
          <div className="text-[#9aa0aa] mt-0.5">
            {payslip.status === "APPROVED" ? "Approved" : "Draft"} · {formatDate(payslip.approved_at || payslip.generated_at)}
          </div>
        </div>
      </div>

      <div className="py-8 space-y-1">
        {payslip.line_items.map((item) => (
          <div key={item.component_code} className="flex justify-between text-[13px] py-2">
            <span className="text-[#5b6270]">
              {item.component_name}
              {item.component_type === "DEDUCTION" && <span className="text-[#c1c6cf]"> (deduction)</span>}
            </span>
            <span className={`tabular-nums ${item.component_type === "DEDUCTION" ? "text-[#c1372f]" : "text-[#1f2328]"}`}>
              {item.component_type === "DEDUCTION" ? "− " : ""}
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-baseline pt-6 border-t border-[#1f2328]">
        <span className="text-[13px] tracking-wide uppercase text-[#9aa0aa]">Net Pay</span>
        <span className="text-[24px] font-light tabular-nums">{formatCurrency(payslip.net_pay)}</span>
      </div>

      <div className="mt-14 space-y-1 text-center">
        <p className="text-[10.5px] text-[#c1c6cf] leading-relaxed max-w-md mx-auto">
          Computer-generated, no signature required. Net pay reflects configured salary components only — tax and
          statutory deductions are not yet calculated.
        </p>
        {payslip.footer_note && <p className="text-[10.5px] text-[#c1c6cf]">{payslip.footer_note}</p>}
        {employerFooter.legal && <p className="text-[10px] text-[#c1c6cf]">{employerFooter.legal}</p>}
        {employerFooter.contact && <p className="text-[9.5px] text-[#c1c6cf]">{employerFooter.contact}</p>}
      </div>
    </div>
  );
}
