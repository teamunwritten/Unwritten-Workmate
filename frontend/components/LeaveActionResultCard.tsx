import Link from "next/link";
import { LeaveActionResult } from "@/lib/leaveAction";

export default function LeaveActionResultCard({ result }: { result: LeaveActionResult }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <div className="h-9 w-9 rounded-lg bg-sidebar-active mx-auto flex items-center justify-center text-white text-xs font-bold">
            UW
          </div>
        </div>
        <div className="card p-8">
          <div className="text-4xl mb-4">{result.ok ? "✅" : "⚠️"}</div>
          <h1 className={`text-lg font-semibold ${result.ok ? "text-success" : "text-ink"}`}>{result.title}</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">{result.message}</p>
          <Link href="/dashboard" className="btn-primary inline-block mt-6 text-sm">
            Go to portal
          </Link>
        </div>
      </div>
    </div>
  );
}
