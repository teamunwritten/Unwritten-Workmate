import { backendFetch } from "@/lib/session";
import { LeaveApplication, LeaveType } from "@/lib/types";
import LeaveCalendarApply from "@/components/LeaveCalendarApply";
import LeaveSectionTabs from "@/components/LeaveSectionTabs";

async function getLeaveTypes(): Promise<LeaveType[]> {
  const res = await backendFetch("/leave/leave-types");
  if (!res.ok) return [];
  return res.json();
}

async function getApplications(): Promise<LeaveApplication[]> {
  const res = await backendFetch("/leave/applications");
  if (!res.ok) return [];
  return res.json();
}

export default async function ApplyLeavePage() {
  const [leaveTypes, applications] = await Promise.all([getLeaveTypes(), getApplications()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Leave</h1>
      </div>
      <LeaveSectionTabs />
      <div>
        <p className="text-sm text-muted mb-4">Click a date to apply for one day, or drag across dates for a bulk request.</p>
        <LeaveCalendarApply leaveTypes={leaveTypes} applications={applications} />
      </div>
    </div>
  );
}
