import { backendFetch } from "@/lib/session";
import { LeaveApplication } from "@/lib/types";
import ApprovalQueueTable from "@/components/ApprovalQueueTable";

async function getPending(): Promise<LeaveApplication[]> {
  const res = await backendFetch("/leave/approvals/pending");
  if (!res.ok) return [];
  return res.json();
}

export default async function ApprovalsPage() {
  const applications = await getPending();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Approvals</h1>
        <p className="text-sm text-muted">Requests awaiting your decision.</p>
      </div>
      <div className="card overflow-hidden">
        <ApprovalQueueTable applications={applications} />
      </div>
    </div>
  );
}
