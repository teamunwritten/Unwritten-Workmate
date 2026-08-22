import { resolveLeaveActionToken } from "@/lib/leaveAction";
import LeaveActionResultCard from "@/components/LeaveActionResultCard";

export default async function RejectLeavePage({ searchParams }: { searchParams: { token?: string } }) {
  const result = await resolveLeaveActionToken(searchParams.token);
  return <LeaveActionResultCard result={result} />;
}
