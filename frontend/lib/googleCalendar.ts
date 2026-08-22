function toGoogleDate(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

/** Google Calendar's "render" template treats the end date as exclusive, so an all-day
 * event spanning start_date..end_date (inclusive) needs end+1 day here. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  startDate: string;
  endDate: string;
  details?: string;
}): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${toGoogleDate(params.startDate)}/${toGoogleDate(addDays(params.endDate, 1))}`);
  if (params.details) url.searchParams.set("details", params.details);
  return url.toString();
}
