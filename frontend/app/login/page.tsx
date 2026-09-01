import BrandMark from "@/components/BrandMark";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.54 5.54 0 01-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.66z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0012 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 014.9 12c0-.79.14-1.56.37-2.28V6.63H1.27A12 12 0 000 12c0 1.93.46 3.76 1.27 5.37l4-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.94 1.19 15.24 0 12 0A12 12 0 001.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function FeatureRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="text-[13.5px] font-semibold text-white">{title}</div>
        <div className="text-[12.5px] text-white/60 mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Branding panel -- hidden on small screens, shown from lg breakpoint up */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-sidebar-bg">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 15% 15%, rgba(46,111,232,0.5), transparent 45%), radial-gradient(circle at 85% 85%, rgba(46,111,232,0.35), transparent 50%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <BrandMark dark />

          <div className="space-y-8 max-w-sm">
            <div>
              <h1 className="text-[28px] font-semibold text-white leading-tight tracking-tight">
                Leave &amp; workforce management, in one place.
              </h1>
              <p className="text-[13.5px] text-white/55 mt-3 leading-relaxed">
                Apply for leave, track approvals, and stay in sync with your team's availability — all from a single
                dashboard.
              </p>
            </div>

            <div className="space-y-5">
              <FeatureRow
                icon={
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                title="Policy-aware approvals"
                body="Notice periods, sandwich rules, and balances are enforced automatically."
              />
              <FeatureRow
                icon={
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                title="Team calendar"
                body="See who's on leave or working from home at a glance, org-wide."
              />
              <FeatureRow
                icon={
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M4.93 4.93l14.14 14.14M12 21a9 9 0 100-18 9 9 0 000 18z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                title="Secure by design"
                body="Signed in with your work Google account — no separate passwords to manage."
              />
            </div>
          </div>

          <div className="text-[11.5px] text-white/35">© {new Date().getFullYear()} Team Unwritten. All rights reserved.</div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8 text-center">
            <div className="h-10 w-10 rounded-lg bg-sidebar-active mx-auto flex items-center justify-center text-white text-sm font-bold">
              UW
            </div>
            <div className="text-base font-semibold tracking-tight mt-3">Unwritten Workmate</div>
            <div className="text-sm text-muted">Team Unwritten</div>
          </div>

          <div className="mb-7">
            <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted mt-1">Sign in to continue to your workspace.</p>
          </div>

          {searchParams?.error && (
            <div className="mb-4 rounded-lg bg-danger-soft text-danger text-sm px-3.5 py-2.5">{searchParams.error}</div>
          )}

          <a
            href="/api/auth/google/start"
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-surface py-3 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-canvas hover:border-ink/20"
          >
            <GoogleIcon />
            Sign in with Google
          </a>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted">Enterprise sign-in</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-xs text-muted text-center leading-relaxed">
            Use the work Google account your HR admin registered for you. Don't have access yet? Contact your HR
            administrator to get provisioned.
          </p>
        </div>
      </div>
    </div>
  );
}
