"use client";

import { useEffect, useState } from "react";
import { deleteFile, downloadUrl, listOrganizationFiles, listSharedWithMe, uploadFile } from "@/lib/api/files";
import { listColleagues } from "@/lib/api/leave";
import { FileAsset, FileVisibility } from "@/lib/types";
import Icon from "@/components/Icon";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";

const ALL_TABS = [
  { key: "shared", label: "Shared with Me", adminOnly: false },
  { key: "organization", label: "Organization", adminOnly: false },
] as const;
type TabKey = (typeof ALL_TABS)[number]["key"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabKey>("shared");
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [colleagues, setColleagues] = useState<{ id: number; full_name: string; email: string }[]>([]);

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<FileVisibility>("ORGANIZATION");
  const [sharedWithId, setSharedWithId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => setIsAdmin(user?.role === "HR_ADMIN"));
  }, []);

  async function load(activeTab: TabKey) {
    setLoading(true);
    try {
      const data = activeTab === "shared" ? await listSharedWithMe() : await listOrganizationFiles();
      setFiles(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin !== null) load(tab);
  }, [tab, isAdmin]);

  useEffect(() => {
    if (isAdmin) listColleagues().then(setColleagues);
  }, [isAdmin]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setError(null);
    setUploading(true);
    try {
      await uploadFile(selectedFile, visibility, visibility === "EMPLOYEE" ? Number(sharedWithId) : undefined);
      setShowUpload(false);
      setSelectedFile(null);
      setVisibility("ORGANIZATION");
      setSharedWithId("");
      showToast("File uploaded.", "success");
      await load(tab);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm("Delete this file? This can't be undone.", {
      title: "Delete file",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteFile(id);
      showToast("File deleted.", "success");
      await load(tab);
    } catch (err: any) {
      showToast(err.message || "Could not delete this file.", "error");
    }
  }

  const visibleTabs = ALL_TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="-m-6 space-y-0">
      <div className="bg-sidebar-bg px-6 flex items-center justify-between">
        <div className="flex gap-7">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-4 text-[15px] border-b-2 -mb-px transition-colors ${
                tab === t.key ? "border-brand text-white font-semibold" : "border-transparent text-sidebar-muted hover:text-white font-medium"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload((v) => !v)}
            title="Upload file"
            className="h-8 w-8 rounded-md bg-brand hover:bg-brand-hover text-white flex items-center justify-center shrink-0"
          >
            <Icon name="upload" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
      {isAdmin && showUpload && (
        <form onSubmit={handleUpload} className="card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">File</label>
            <input
              type="file"
              required
              className="input"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Share with</label>
            <div className="flex gap-2">
              {(["EMPLOYEE", "ORGANIZATION"] as FileVisibility[]).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                    visibility === v ? "bg-brand-soft text-brand border-brand" : "border-border text-ink"
                  }`}
                >
                  {v === "EMPLOYEE" ? "Specific employee" : "Whole organization"}
                </button>
              ))}
            </div>
          </div>
          {visibility === "EMPLOYEE" && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Employee</label>
              <select className="input" required value={sharedWithId} onChange={(e) => setSharedWithId(e.target.value)}>
                <option value="">Select employee</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <div className="text-sm text-danger">{error}</div>}
          <button type="submit" disabled={uploading} className="btn-primary">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Loading...</div>
        ) : files.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Icon name="folder" className="h-8 w-8 text-muted mx-auto mb-3" />
            <div className="text-sm font-medium">No files to display</div>
            <div className="text-xs text-muted mt-1">
              {tab === "shared" && "Files shared with you by HR will be listed here."}
              {tab === "organization" && "Files shared with the whole organization will be listed here."}
            </div>
          </div>
        ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Shared with</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Icon name="fileIcon" className="h-4 w-4 text-muted shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.original_filename}</div>
                        <div className="text-[11px] text-muted">by {f.uploaded_by_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted">
                    {f.visibility === "ORGANIZATION" ? "Organization" : f.visibility === "EMPLOYEE" ? f.shared_with_employee_name : "Only me"}
                  </td>
                  <td className="text-muted tabular-nums">{formatSize(f.size_bytes)}</td>
                  <td className="text-muted">{new Date(f.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-3 justify-end">
                      <a href={downloadUrl(f.id)} className="text-brand text-xs font-medium flex items-center gap-1">
                        <Icon name="download" className="h-3.5 w-3.5" />
                        Download
                      </a>
                      {isAdmin && (
                        <button onClick={() => handleDelete(f.id)} className="text-muted hover:text-danger text-xs font-medium">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  );
}
