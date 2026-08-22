import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { Department, Employee, EmployeeTreeNode, Holiday, LeaveBalance, LeavePolicy, LeaveType, PolicyVersion } from "@/lib/types";

export const listDepartments = () => apiGet<Department[]>("/admin/departments");

export const listEmployees = () => apiGet<Employee[]>("/admin/employees");
export const getEmployee = (id: number) => apiGet<Employee>(`/admin/employees/${id}`);
export const getEmployeeBalances = (id: number) => apiGet<LeaveBalance[]>(`/admin/employees/${id}/balances`);
export const createEmployee = (payload: Record<string, unknown>) => apiPost<Employee>("/admin/employees", payload);
export const updateEmployee = (id: number, payload: Record<string, unknown>) =>
  apiPatch<Employee>(`/admin/employees/${id}`, payload);
export const getEmployeeTree = () => apiGet<EmployeeTreeNode[]>("/admin/employees/tree");

export const listLeaveTypes = () => apiGet<LeaveType[]>("/admin/leave-types");
export const createLeaveType = (payload: Record<string, unknown>) => apiPost<LeaveType>("/admin/leave-types", payload);
export const updateLeaveType = (id: number, payload: Record<string, unknown>) =>
  apiPatch<LeaveType>(`/admin/leave-types/${id}`, payload);

export const listPolicyVersions = () => apiGet<PolicyVersion[]>("/admin/policy-versions");
export const createPolicyVersion = (payload: Record<string, unknown>) =>
  apiPost<PolicyVersion>("/admin/policy-versions", payload);
export const listLeavePolicies = (versionId: number) =>
  apiGet<LeavePolicy[]>(`/admin/policy-versions/${versionId}/leave-policies`);
export const updateLeavePolicy = (versionId: number, leaveTypeId: number, payload: Record<string, unknown>) =>
  apiPatch<LeavePolicy>(`/admin/policy-versions/${versionId}/leave-policies/${leaveTypeId}`, payload);

export const listHolidays = (year?: number) => apiGet<Holiday[]>(`/admin/holidays${year ? `?year=${year}` : ""}`);
export const createHoliday = (payload: Record<string, unknown>) => apiPost<Holiday>("/admin/holidays", payload);
export const deleteHoliday = (id: number) => apiDelete<void>(`/admin/holidays/${id}`);

export const listRestrictionRules = (policyVersionId?: number) =>
  apiGet<any[]>(`/admin/leave-type-restrictions${policyVersionId ? `?policy_version_id=${policyVersionId}` : ""}`);
export const createRestrictionRule = (payload: Record<string, unknown>) =>
  apiPost("/admin/leave-type-restrictions", payload);
export const deleteRestrictionRule = (id: number) => apiDelete<void>(`/admin/leave-type-restrictions/${id}`);

export const createEligibilityRule = (payload: Record<string, unknown>) =>
  apiPost("/admin/leave-type-eligibility-rules", payload);

export const createBalanceAdjustment = (employeeId: number, payload: Record<string, unknown>) =>
  apiPost(`/admin/employees/${employeeId}/balance-adjustments`, payload);
