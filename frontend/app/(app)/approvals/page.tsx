import ApprovalQueueTable from "@/components/ApprovalQueueTable";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Approvals</h1>
        <p className="text-sm text-muted">Requests awaiting your decision.</p>
      </div>
      <div className="card overflow-hidden">
        <ApprovalQueueTable />
      </div>
    </div>
  );
}
