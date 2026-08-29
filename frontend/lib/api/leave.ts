import { apiGet, apiPost } from "@/lib/api/client";
import { pageQueryString, PageQuery } from "@/lib/api/query";
import { LeaveApplication, LeaveApplicationCreate, LeaveBalance, Paginated } from "@/lib/types";

export const getBalances = () => apiGet<LeaveBalance[]>("/leave/balances");
export const listApplications = () => apiGet<LeaveApplication[]>("/leave/applications");
export const getApplication = (id: number) => apiGet<LeaveApplication>(`/leave/applications/${id}`);
export const createApplication = (payload: LeaveApplicationCreate) =>
  apiPost<LeaveApplication>("/leave/applications", payload);
export const cancelApplication = (id: number, reason?: string) =>
  apiPost<LeaveApplication>(`/leave/applications/${id}/cancel`, { reason });
export const approveApplication = (id: number, comment?: string) =>
  apiPost<LeaveApplication>(`/leave/applications/${id}/approve`, { comment });
export const rejectApplication = (id: number, comment?: string) =>
  apiPost<LeaveApplication>(`/leave/applications/${id}/reject`, { comment });
export const listPendingApprovals = () => apiGet<LeaveApplication[]>("/leave/approvals/pending");
export const listPendingApprovalsPage = (params: PageQuery) =>
  apiGet<Paginated<LeaveApplication>>(`/leave/approvals/pending/page${pageQueryString(params)}`);
export const bulkApprovalAction = (application_ids: number[], action: "APPROVE" | "REJECT", comment?: string) =>
  apiPost<{ application_id: number; ok: boolean; detail: string | null }[]>("/leave/approvals/bulk-action", {
    application_ids,
    action,
    comment,
  });
export const listColleagues = () =>
  apiGet<{ id: number; full_name: string; email: string; picture_url: string | null }[]>("/leave/colleagues");
