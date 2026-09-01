export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type EmployeeRole = "EMPLOYEE" | "MANAGER" | "HR_ADMIN";

const ROLE_LABELS: Record<EmployeeRole, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  HR_ADMIN: "Admin",
};

export function roleLabel(role: EmployeeRole): string {
  return ROLE_LABELS[role] ?? role;
}
export type EmploymentStatus = "PROBATION" | "ACTIVE" | "NOTICE_PERIOD" | "TERMINATED";
export type SessionType = "FIRST_HALF" | "SECOND_HALF" | "FULL_DAY";
export type RequestKind = "LEAVE" | "WFH" | "OD";

export interface CurrentUser {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  picture_url: string | null;
  position: string | null;
  role: EmployeeRole;
  employment_status: EmploymentStatus;
  department_id: number;
  department_name: string | null;
  manager_id: number | null;
  manager_name: string | null;
  date_of_joining: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  posted_by_employee_id: number;
  posted_by_name: string | null;
  created_at: string;
}

export interface Birthday {
  employee_id: number;
  full_name: string;
  picture_url: string | null;
  date_of_birth: string;
}

export interface NewHire {
  employee_id: number;
  full_name: string;
  picture_url: string | null;
  position: string | null;
  role: EmployeeRole;
  department_name: string | null;
  date_of_joining: string;
}

export interface DepartmentMember {
  employee_id: number;
  full_name: string;
  picture_url: string | null;
  position: string | null;
  role: EmployeeRole;
  email: string;
}

export interface UpcomingHoliday {
  id: number;
  date: string;
  name: string;
  holiday_type: "STATUTORY" | "OPTIONAL";
}

export interface LeaveBalance {
  leave_type_id: number;
  leave_type_code: string;
  year: number;
  entitled_days: number;
  accrued_days: number;
  used_days: number;
  carried_forward_days: number;
  available_days: number;
}

export interface SessionInput {
  date: string;
  session: SessionType;
}

export interface LeaveApplicationCreate {
  leave_type_id: number;
  request_kind: RequestKind;
  sessions: SessionInput[];
  reason?: string;
}

export interface CheckResultOut {
  check_name: string;
  outcome: string;
  reason_code: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
}

export interface ValidationErrorResponse {
  outcome: string;
  violations: CheckResultOut[];
}

export interface ApprovalActionEntry {
  id: number;
  actor_employee_id: number;
  actor_name: string | null;
  action: string;
  comment: string | null;
  acted_at: string;
}

export interface LeaveApplication {
  id: number;
  day_request_id: number;
  leave_type_id: number;
  leave_type_code: string | null;
  status: string;
  resolution_type: string;
  is_lop: boolean;
  applied_days: number;
  sandwich_days_added: number;
  total_deducted_days: number;
  reason: string | null;
  applied_at: string;
  start_date: string;
  end_date: string;
  approver_employee_id: number | null;
  approver_name?: string | null;
  approver_picture_url?: string | null;
  pending_level?: number | null;
  employee_id?: number | null;
  employee_name?: string | null;
  employee_code?: string | null;
  employee_picture_url?: string | null;
  approval_history?: ApprovalActionEntry[];
}

export interface CalendarEntry {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  picture_url: string | null;
  date: string;
  session: string;
  request_kind: string;
  status: string;
  display_status: string;
  leave_type_code: string | null;
  notes: string | null;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  default_annual_days: number;
  accrual_mode: string;
  allow_lop_conversion: boolean;
  is_active: boolean;
}

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  picture_url: string | null;
  position: string | null;
  phone_number: string | null;
  personal_email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  department_id: number;
  department_name: string | null;
  manager_id: number | null;
  manager_name: string | null;
  date_of_joining: string;
  date_of_birth: string | null;
  employment_status: EmploymentStatus;
  notice_period_start: string | null;
  notice_period_end: string | null;
  role: EmployeeRole;
  is_active: boolean;
  google_linked: boolean;
}

export interface Department {
  id: number;
  name: string;
  parent_department_id: number | null;
}

export interface EmployeeTreeNode {
  id: number;
  full_name: string;
  picture_url: string | null;
  position: string | null;
  role: EmployeeRole;
  department_id: number;
  department_name: string | null;
  employment_status: EmploymentStatus;
  reports: EmployeeTreeNode[];
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  holiday_type: "STATUTORY" | "OPTIONAL";
  year: number;
}

export interface PolicyVersion {
  id: number;
  version_label: string;
  effective_from: string;
  effective_to: string | null;
  recalculation_mode: string;
  notes: string | null;
}

export type FileVisibility = "PRIVATE" | "EMPLOYEE" | "ORGANIZATION";

export interface FileAsset {
  id: number;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_employee_id: number;
  uploaded_by_name: string;
  visibility: FileVisibility;
  shared_with_employee_id: number | null;
  shared_with_employee_name: string | null;
  created_at: string;
}

export interface LeavePolicy {
  id: number;
  policy_version_id: number;
  leave_type_id: number;
  notice_buffer_trigger_days: number | null;
  notice_buffer_required_days: number | null;
  max_backdate_days: number;
  same_day_cutoff_time: string | null;
  year_end_behavior: string;
  carry_forward_cap: number | null;
  zero_balance_action: string;
  sandwich_policy_enabled: boolean;
}

export interface OrgSettings {
  requires_second_level_approval: boolean;
}

export type ComponentType = "EARNING" | "DEDUCTION";
export type CalculationType = "FIXED" | "PERCENTAGE_OF_BASIC" | "PERCENTAGE_OF_CTC" | "FORMULA";
export type PayrollRunStatus = "DRAFT" | "PROCESSING" | "COMPLETED";
export type PayrollRunEntryStatus = "PENDING" | "INCLUDED" | "EXCLUDED";

export interface SalaryComponent {
  id: number;
  code: string;
  name: string;
  component_type: ComponentType;
  calculation_type: CalculationType;
  percentage_of_basic: number | null;
  is_taxable: boolean;
  is_active: boolean;
}

export interface SalaryStructureComponent {
  id: number;
  salary_component_id: number;
  component_code: string;
  component_name: string;
  component_type: ComponentType;
  calculation_type: CalculationType;
  default_value: number | null;
  display_order: number;
}

export interface SalaryStructure {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  components: SalaryStructureComponent[];
}

export interface ResolvedComponentValue {
  salary_component_id: number;
  component_code: string;
  component_name: string;
  component_type: ComponentType;
  resolved_value: number;
}

export interface EmployeeSalaryAssignment {
  id: number;
  employee_id: number;
  salary_structure_id: number;
  salary_structure_name: string;
  effective_from: string;
  effective_to: string | null;
  annual_ctc: number;
  is_active: boolean;
  component_values: ResolvedComponentValue[];
}

export interface EmployeeSalaryAssignmentSummary {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  salary_structure_id: number;
  salary_structure_name: string;
  annual_ctc: number;
  effective_from: string;
}

export interface PayrollRun {
  id: number;
  period_month: number;
  period_year: number;
  status: PayrollRunStatus;
  run_date: string | null;
  created_at: string;
  entry_count: number;
}

export interface PayrollRunEntry {
  id: number;
  employee_id: number;
  employee_name: string;
  salary_structure_id: number | null;
  status: PayrollRunEntryStatus;
  gross_amount: number | null;
  payslip_id: number | null;
  payslip_status: "DRAFT" | "APPROVED" | null;
}

export interface PayrollRunDetail extends PayrollRun {
  entries: PayrollRunEntry[];
}

export interface PayslipHeaderConfig {
  company_name?: string;
  company_tagline?: string;
  company_legal_name?: string;
  company_pan?: string;
  registered_office_address?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_data_url?: string;
}

export type PayslipDesign =
  | "CLASSIC"
  | "MODERN"
  | "MINIMAL"
  | "FORMAL"
  | "COMPACT"
  | "BOLD"
  | "ELEGANT"
  | "FINTECH"
  | "SPLIT"
  | "TABULAR"
  | "EXECUTIVE";

export const PAYSLIP_DESIGN_LABELS: Record<PayslipDesign, string> = {
  CLASSIC: "Classic Ledger",
  MODERN: "Modern Card",
  MINIMAL: "Minimal",
  FORMAL: "Corporate Formal",
  COMPACT: "Compact",
  BOLD: "Bold Branded",
  ELEGANT: "Elegant Mono",
  FINTECH: "Fintech Statement",
  SPLIT: "Split Sidebar",
  TABULAR: "Tabular Grid",
  EXECUTIVE: "Executive Summary",
};

export interface PayslipTemplate {
  id: number;
  name: string;
  is_default: boolean;
  design: PayslipDesign;
  header_config: PayslipHeaderConfig | null;
  footer_note: string | null;
  is_active: boolean;
}

export interface PayslipLineItem {
  component_code: string;
  component_name: string;
  component_type: string;
  value: number;
}

export type PayslipStatus = "DRAFT" | "APPROVED";

export interface Payslip {
  id: number;
  reference_number: string;
  payroll_run_entry_id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  position: string | null;
  department_name: string | null;
  payslip_template_id: number;
  design: PayslipDesign;
  header_config: PayslipHeaderConfig | null;
  footer_note: string | null;
  generated_at: string;
  period_month: number;
  period_year: number;
  gross_pay: number;
  net_pay: number;
  line_items: PayslipLineItem[];
  status: PayslipStatus;
  approved_at: string | null;
  approved_by_name: string | null;
}
