export interface PageQuery {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  q?: string;
}

export function pageQueryString(params: PageQuery): string {
  const usp = new URLSearchParams();
  if (params.page) usp.set("page", String(params.page));
  if (params.page_size) usp.set("page_size", String(params.page_size));
  if (params.sort_by) usp.set("sort_by", params.sort_by);
  if (params.sort_dir) usp.set("sort_dir", params.sort_dir);
  if (params.q) usp.set("q", params.q);
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}
