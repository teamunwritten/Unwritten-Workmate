import { PayslipHeaderConfig } from "@/lib/types";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function companyBranding(headerConfig: PayslipHeaderConfig | null) {
  const companyName = headerConfig?.company_name?.trim() || "Unwritten Workmate";
  const companyTagline = headerConfig?.company_tagline?.trim() || "Team Unwritten";
  const companyInitials = companyName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const logoDataUrl = headerConfig?.logo_data_url?.trim() || null;
  return { companyName, companyTagline, companyInitials, logoDataUrl };
}

/** A single formatted line of employer statutory/contact details for the payslip footer --
 * only the fields the admin actually filled in on the template appear, each separated by " · ". */
export function employerDetailsLine(headerConfig: PayslipHeaderConfig | null): string {
  if (!headerConfig) return "";
  const parts: string[] = [];
  if (headerConfig.company_legal_name) parts.push(headerConfig.company_legal_name);
  if (headerConfig.company_pan) parts.push(`PAN ${headerConfig.company_pan}`);
  if (headerConfig.registered_office_address) parts.push(headerConfig.registered_office_address);
  if (headerConfig.contact_email) parts.push(headerConfig.contact_email);
  if (headerConfig.contact_phone) parts.push(headerConfig.contact_phone);
  return parts.join(" · ");
}
