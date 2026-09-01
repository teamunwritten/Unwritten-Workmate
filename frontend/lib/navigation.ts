export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/leave/history", label: "Leaves", icon: "apply" },
  { href: "/approvals", label: "Approvals", icon: "approvals", roles: ["MANAGER", "HR_ADMIN"] },
  { href: "/calendar", label: "Team Calendar", icon: "calendar" },
  { href: "/org-chart", label: "Org Chart", icon: "tree" },
  { href: "/files", label: "Files", icon: "folder" },
];

export const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin/employees", label: "Employees", icon: "employees" },
  { href: "/admin/leave-types", label: "Leave Types", icon: "leaveType" },
  { href: "/admin/policies", label: "Policies", icon: "policy" },
  { href: "/admin/holidays", label: "Holidays", icon: "holiday" },
  { href: "/admin/restrictions", label: "Restrictions", icon: "restriction" },
  { href: "/admin/balance-adjustments", label: "Balance Adjustments", icon: "adjustment" },
];

// ---------- Payroll ----------
// Create a run for a period, generate payslips from it, and manage the templates they use.
export const PAYROLL_ITEMS: NavItem[] = [
  { href: "/payroll/runs", label: "Payroll Runs", icon: "fileIcon", roles: ["HR_ADMIN"] },
  { href: "/payroll/payslip-templates", label: "Payslip Templates", icon: "receipt", roles: ["HR_ADMIN"] },
];

// ---------- Compensation ----------
// The salary structure/component data every payslip is built from.
export const COMPENSATION_ITEMS: NavItem[] = [
  { href: "/compensation/structures", label: "Salary Structures", icon: "wallet", roles: ["HR_ADMIN"] },
  { href: "/compensation/components", label: "Salary Components", icon: "wallet", roles: ["HR_ADMIN"] },
  { href: "/compensation/assign", label: "Assign to Employee", icon: "employees", roles: ["HR_ADMIN"] },
];

// ---------- Employee Self Service ----------
export const ESS_ITEMS: NavItem[] = [{ href: "/ess/payslips", label: "My Payslips", icon: "fileIcon" }];

export interface NavSection {
  key: string;
  title: string;
  icon: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  { key: "payroll", title: "Payroll", icon: "adjustment", items: PAYROLL_ITEMS },
  { key: "compensation", title: "Compensation", icon: "wallet", items: COMPENSATION_ITEMS },
  { key: "ess", title: "Employee Self Service", icon: "user", items: ESS_ITEMS },
];

// All route labels, longest href first, so breadcrumb matching prefers the most specific match.
export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_ITEMS,
  ...ADMIN_ITEMS,
  ...NAV_SECTIONS.flatMap((section) => section.items),
].sort((a, b) => b.href.length - a.href.length);

export const SECTION_LABELS: Record<string, string> = {
  "/leave": "Leaves",
  "/admin": "Admin",
  "/payroll": "Payroll",
  "/compensation": "Compensation",
  "/ess": "Employee Self Service",
};
