import { resolveLeaveActionToken } from "@/lib/leaveAction";
import LeaveActionResultCard from "@/components/LeaveActionResultCard";

export default async function ApproveLeavePage({ searchParams }: { searchParams: { token?: string } }) {
  const result = await resolveLeaveActionToken(searchParams.token);
  return <LeaveActionResultCard result={result} />;
}
