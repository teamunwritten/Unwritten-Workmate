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

/** Two separate formatted lines of employer footer details, kept apart because they carry
 * different weight: legal identity (name, PAN, registered address -- has compliance/statutory
 * relevance) vs. contact (email, phone -- just how to reach support). Only fields the admin
 * actually filled in on the template appear, each joined by " · ". */
export function employerFooterLines(headerConfig: PayslipHeaderConfig | null): { legal: string; contact: string } {
  if (!headerConfig) return { legal: "", contact: "" };
  const legalParts: string[] = [];
  if (headerConfig.company_legal_name) legalParts.push(headerConfig.company_legal_name);
  if (headerConfig.company_pan) legalParts.push(`PAN ${headerConfig.company_pan}`);
  if (headerConfig.registered_office_address) legalParts.push(headerConfig.registered_office_address);

  const contactParts: string[] = [];
  if (headerConfig.contact_email) contactParts.push(headerConfig.contact_email);
  if (headerConfig.contact_phone) contactParts.push(headerConfig.contact_phone);

  return { legal: legalParts.join(" · "), contact: contactParts.join(" · ") };
}
