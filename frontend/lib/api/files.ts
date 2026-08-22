import { apiDelete, apiGet, apiUpload } from "@/lib/api/client";
import { FileAsset, FileVisibility } from "@/lib/types";

export const listMyFiles = () => apiGet<FileAsset[]>("/files/mine");
export const listSharedWithMe = () => apiGet<FileAsset[]>("/files/shared-with-me");
export const listOrganizationFiles = () => apiGet<FileAsset[]>("/files/organization");
export const deleteFile = (id: number) => apiDelete<void>(`/files/${id}`);
export const downloadUrl = (id: number) => `/api/proxy/files/${id}/download`;

export function uploadFile(file: File, visibility: FileVisibility, sharedWithEmployeeId?: number) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("visibility", visibility);
  if (sharedWithEmployeeId) formData.append("shared_with_employee_id", String(sharedWithEmployeeId));
  return apiUpload<FileAsset>("/files", formData);
}
