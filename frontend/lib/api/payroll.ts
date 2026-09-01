import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { PayrollRun, PayrollRunDetail, Payslip, PayslipTemplate } from "@/lib/types";

export const listPayrollRuns = () => apiGet<PayrollRun[]>("/payroll/runs");
export const createPayrollRun = (payload: { period_month: number; period_year: number }) =>
  apiPost<PayrollRun>("/payroll/runs", payload);
export const getPayrollRun = (id: number) => apiGet<PayrollRunDetail>(`/payroll/runs/${id}`);
export const updatePayrollRunStatus = (id: number, status: string) =>
  apiPatch<PayrollRun>(`/payroll/runs/${id}`, { status });

export const listPayslipTemplates = () => apiGet<PayslipTemplate[]>("/payroll/payslip-templates");
export const createPayslipTemplate = (payload: Record<string, unknown>) =>
  apiPost<PayslipTemplate>("/payroll/payslip-templates", payload);
export const updatePayslipTemplate = (id: number, payload: Record<string, unknown>) =>
  apiPatch<PayslipTemplate>(`/payroll/payslip-templates/${id}`, payload);

export const generatePayslips = (runId: number, payslipTemplateId?: number) =>
  apiPost<Payslip[]>(`/payroll/runs/${runId}/generate-payslips`, { payslip_template_id: payslipTemplateId ?? null });
export const getPayslip = (id: number) => apiGet<Payslip>(`/payroll/payslips/${id}`);
export const approvePayslip = (id: number) => apiPost<Payslip>(`/payroll/payslips/${id}/approve`);
export const approveRunPayslips = (runId: number) => apiPost<Payslip[]>(`/payroll/runs/${runId}/approve-payslips`);
export const listMyPayslips = () => apiGet<Payslip[]>("/payroll/my-payslips");
