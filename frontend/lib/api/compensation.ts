import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { EmployeeSalaryAssignment, EmployeeSalaryAssignmentSummary, SalaryComponent, SalaryStructure } from "@/lib/types";

export const listSalaryComponents = () => apiGet<SalaryComponent[]>("/compensation/components");
export const createSalaryComponent = (payload: Record<string, unknown>) =>
  apiPost<SalaryComponent>("/compensation/components", payload);
export const updateSalaryComponent = (id: number, payload: Record<string, unknown>) =>
  apiPatch<SalaryComponent>(`/compensation/components/${id}`, payload);

export const listSalaryStructures = () => apiGet<SalaryStructure[]>("/compensation/structures");
export const getSalaryStructure = (id: number) => apiGet<SalaryStructure>(`/compensation/structures/${id}`);
export const createSalaryStructure = (payload: Record<string, unknown>) =>
  apiPost<SalaryStructure>("/compensation/structures", payload);
export const updateSalaryStructure = (id: number, payload: Record<string, unknown>) =>
  apiPatch<SalaryStructure>(`/compensation/structures/${id}`, payload);
export const addStructureComponent = (structureId: number, payload: Record<string, unknown>) =>
  apiPost<SalaryStructure>(`/compensation/structures/${structureId}/components`, payload);

export const listAssignments = () => apiGet<EmployeeSalaryAssignmentSummary[]>("/compensation/assignments");
export const getEmployeeAssignment = (employeeId: number) =>
  apiGet<EmployeeSalaryAssignment | null>(`/compensation/employees/${employeeId}/assignment`);
export const assignSalaryStructure = (employeeId: number, payload: Record<string, unknown>) =>
  apiPost<EmployeeSalaryAssignment>(`/compensation/employees/${employeeId}/assignment`, payload);
