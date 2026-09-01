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

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ` ${ONES[ones]}` : "");
}

function threeDigitWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigitWords(rest));
  return parts.join(" ");
}

/** Indian numbering (crore/lakh/thousand), e.g. 65000 -> "Rupees Sixty Five Thousand Only",
 * 1832500.50 -> "Rupees Eighteen Lakh Thirty Two Thousand Five Hundred and Fifty Paise Only". */
export function amountInWords(value: number): string {
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Rupees Zero Only";

  let n = rupees;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitWords(hundred));

  let words = `Rupees ${parts.join(" ")}`;
  if (paise) words += ` and ${twoDigitWords(paise)} Paise`;
  return `${words} Only`;
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
