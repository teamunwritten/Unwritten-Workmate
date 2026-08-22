import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";
import Icon from "@/components/Icon";

export default function AddToCalendarBanner({
  leaveTypeCode,
  startDate,
  endDate,
}: {
  leaveTypeCode: string | null;
  startDate: string;
  endDate: string;
}) {
  const url = buildGoogleCalendarUrl({
    title: `${leaveTypeCode || "Leave"} - Out of office`,
    startDate,
    endDate,
    details: "Added from Unwritten Workmate.",
  });

  return (
    <div className="card p-4 flex items-center justify-between gap-4 bg-brand-soft/40 border-brand/30">
      <div className="flex items-center gap-3">
        <Icon name="calendar" className="h-5 w-5 text-brand shrink-0" />
        <div>
          <div className="text-sm font-medium">Your leave is approved</div>
          <div className="text-xs text-muted">Add it to your calendar and update your Slack/Teams status and OOO responder.</div>
        </div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs shrink-0">
        Add to Google Calendar
      </a>
    </div>
  );
}
