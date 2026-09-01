import { Payslip } from "@/lib/types";
import ClassicDesign from "@/components/payslip-designs/Classic";
import ModernDesign from "@/components/payslip-designs/Modern";
import MinimalDesign from "@/components/payslip-designs/Minimal";
import FormalDesign from "@/components/payslip-designs/Formal";
import CompactDesign from "@/components/payslip-designs/Compact";
import BoldDesign from "@/components/payslip-designs/Bold";
import ElegantDesign from "@/components/payslip-designs/Elegant";
import FintechDesign from "@/components/payslip-designs/Fintech";
import SplitDesign from "@/components/payslip-designs/Split";
import TabularDesign from "@/components/payslip-designs/Tabular";
import ExecutiveDesign from "@/components/payslip-designs/Executive";

const DESIGNS: Record<string, React.ComponentType<{ payslip: Payslip }>> = {
  CLASSIC: ClassicDesign,
  MODERN: ModernDesign,
  MINIMAL: MinimalDesign,
  FORMAL: FormalDesign,
  COMPACT: CompactDesign,
  BOLD: BoldDesign,
  ELEGANT: ElegantDesign,
  FINTECH: FintechDesign,
  SPLIT: SplitDesign,
  TABULAR: TabularDesign,
  EXECUTIVE: ExecutiveDesign,
};

export default function PayslipDocument({ payslip }: { payslip: Payslip }) {
  const Design = DESIGNS[payslip.design] ?? ClassicDesign;
  return <Design payslip={payslip} />;
}
