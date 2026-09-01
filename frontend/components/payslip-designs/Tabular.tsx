import { Payslip } from "@/lib/types";
import { MONTHS, companyBranding, employerFooterLines, formatCurrency, formatDate } from "@/lib/payslipFormat";

const CELL = "border border-[#333] px-2.5 py-1.5";
const LABEL = `${CELL} bg-[#f0f0f0] text-[#333] font-medium w-1/6`;
const VALUE = `${CELL} w-1/3`;

export default function TabularDesign({ payslip }: { payslip: Payslip }) {
  const totalDeductions = payslip.line_items.filter((i) => i.component_type === "DEDUCTION").reduce((s, i) => s + i.value, 0);
  const { companyName, logoDataUrl } = companyBranding(payslip.header_config);
  const employerFooter = employerFooterLines(payslip.header_config);

  return (
    <div className="bg-white text-[#1a1a1a] text-[11.5px] p-4 print:p-0">
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td colSpan={4} className="border border-[#333] text-center py-3">
              <div className="flex items-center justify-center gap-2">
                {logoDataUrl && <img src={logoDataUrl} alt="" className="h-7 w-7 object-contain" />}
                <span className="text-[15px] font-bold uppercase">{companyName}</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wide mt-1">
                Salary Slip — {MONTHS[payslip.period_month - 1]} {payslip.period_year}
              </div>
              <div className="text-[10px] text-[#555] mt-0.5">Ref No: {payslip.reference_number}</div>
            </td>
          </tr>
          <tr>
            <td className={LABEL}>Employee Name</td>
            <td className={VALUE}>{payslip.employee_name}</td>
            <td className={LABEL}>Employee Code</td>
            <td className={VALUE}>{payslip.employee_code}</td>
          </tr>
          <tr>
            <td className={LABEL}>Designation</td>
            <td className={VALUE}>{payslip.position || "—"}</td>
            <td className={LABEL}>Department</td>
            <td className={VALUE}>{payslip.department_name || "—"}</td>
          </tr>
          <tr>
            <td className={LABEL}>Pay Period</td>
            <td className={VALUE}>
              {MONTHS[payslip.period_month - 1]} {payslip.period_year}
            </td>
            <td className={LABEL}>Status</td>
            <td className={VALUE}>{payslip.status === "APPROVED" ? "Approved" : "Draft"}</td>
          </tr>
          <tr>
            <td className={LABEL}>Date</td>
            <td className={VALUE} colSpan={3}>
              {formatDate(payslip.approved_at || payslip.generated_at)}
            </td>
          </tr>

          <tr>
            <td colSpan={2} className={`${CELL} bg-[#f0f0f0] font-semibold text-center`}>
              Earnings
            </td>
            <td colSpan={2} className={`${CELL} bg-[#f0f0f0] font-semibold text-center`}>
              Deductions
            </td>
          </tr>
          {Array.from({ length: Math.max(payslip.line_items.filter((i) => i.component_type === "EARNING").length, payslip.line_items.filter((i) => i.component_type === "DEDUCTION").length, 1) }).map(
            (_, i) => {
              const earnings = payslip.line_items.filter((it) => it.component_type === "EARNING");
              const deductions = payslip.line_items.filter((it) => it.component_type === "DEDUCTION");
              return (
                <tr key={i}>
                  <td className={CELL}>{earnings[i]?.component_name ?? ""}</td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {earnings[i] ? earnings[i].value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                  </td>
                  <td className={CELL}>{deductions[i]?.component_name ?? ""}</td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {deductions[i] ? deductions[i].value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                  </td>
                </tr>
              );
            }
          )}
          <tr className="font-semibold">
            <td className={CELL}>Gross Total</td>
            <td className={`${CELL} text-right tabular-nums`}>{payslip.gross_pay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td className={CELL}>Deduction Total</td>
            <td className={`${CELL} text-right tabular-nums`}>{totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr className="font-bold text-[13px]">
            <td colSpan={3} className={`${CELL} bg-[#f0f0f0] text-right`}>
              Net Pay
            </td>
            <td className={`${CELL} text-right tabular-nums`}>{formatCurrency(payslip.net_pay)}</td>
          </tr>
          <tr>
            <td colSpan={4} className={`${CELL} text-[10px] text-[#555] italic`}>
              This is a computer-generated salary slip and does not require a signature. Net pay reflects configured salary
              components only.
              {payslip.footer_note && <> {payslip.footer_note}</>}
              {employerFooter.legal && <> · {employerFooter.legal}</>}
              {employerFooter.contact && <> · {employerFooter.contact}</>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
