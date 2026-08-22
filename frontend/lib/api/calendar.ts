import { apiGet } from "@/lib/api/client";
import { CalendarEntry } from "@/lib/types";

export const getTeamCalendar = (params: { department_id?: number; date_from?: string; date_to?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.department_id) query.set("department_id", String(params.department_id));
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  const qs = query.toString();
  return apiGet<CalendarEntry[]>(`/calendar/team${qs ? `?${qs}` : ""}`);
};
