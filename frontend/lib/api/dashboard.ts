import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { Announcement, Birthday, DepartmentMember, NewHire, UpcomingHoliday } from "@/lib/types";

export const listAnnouncements = () => apiGet<Announcement[]>("/dashboard/announcements");
export const createAnnouncement = (payload: { title: string; body: string }) =>
  apiPost<Announcement>("/dashboard/announcements", payload);
export const deleteAnnouncement = (id: number) => apiDelete<void>(`/dashboard/announcements/${id}`);

export const getBirthdays = () => apiGet<Birthday[]>("/dashboard/birthdays");
export const getNewHires = () => apiGet<NewHire[]>("/dashboard/new-hires");
export const getDepartmentMembers = () => apiGet<DepartmentMember[]>("/dashboard/department-members");
export const getUpcomingHolidays = () => apiGet<UpcomingHoliday[]>("/dashboard/holidays");
