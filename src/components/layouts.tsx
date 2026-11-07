import { ALink } from "@/components/link";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Badge } from "./ui-kit";

function Logo() {
  return (
    <ALink to="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
        M
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-semibold">MapleLeaf Education</span>
        <span className="block text-[11px] text-muted-foreground">Study in Canada Agency</span>
      </span>
    </ALink>
  );
}

const publicNav = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function PublicLayout({ children, showContact = true }: { children: ReactNode; showContact?: boolean }) {
  const { me, logout } = useStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const home = me ? `/${me.role}/dashboard` : "/login";
  const nav = showContact ? publicNav : publicNav.filter((item) => item.to !== "/contact");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <ALink
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              >
                {n.label}
              </ALink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {me ? (
              <>
                <ALink to={home} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">
                  Dashboard
                </ALink>
                <button
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <ALink to="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">
                  Login
                </ALink>
                <ALink
                  to="/register"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
                >
                  Register
                </ALink>
              </>
            )}
          </div>
          <button onClick={() => setOpen(!open)} className="rounded-lg border border-border p-2 md:hidden">
            <span className="sr-only">Menu</span>
            <div className="space-y-1">
              <span className="block h-0.5 w-5 bg-foreground" />
              <span className="block h-0.5 w-5 bg-foreground" />
              <span className="block h-0.5 w-5 bg-foreground" />
            </div>
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-card md:hidden">
            <div className="container-page flex flex-col py-2">
              {[...nav, me ? { to: home, label: "Dashboard" } : { to: "/login", label: "Login" }, ...(me ? [] : [{ to: "/register", label: "Register" }])].map(
                (n) => (
                  <ALink key={n.to + n.label} to={n.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent">
                    {n.label}
                  </ALink>
                ),
              )}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-border bg-surface">
        <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              ที่ปรึกษาการศึกษาต่อประเทศแคนาดา ดูแลตั้งแต่เลือกหลักสูตรถึงวันเดินทาง
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">เมนู</p>
            {nav.map((n) => (
              <ALink key={n.to} to={n.to} className="block py-1 text-sm text-muted-foreground hover:text-primary">
                {n.label}
              </ALink>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">บริการ</p>
            <p className="py-1 text-sm text-muted-foreground">แนะแนวหลักสูตร</p>
            <p className="py-1 text-sm text-muted-foreground">ยื่นสมัครคอลเลจ</p>
            <p className="py-1 text-sm text-muted-foreground">ติดตามสถานะออนไลน์</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">ติดต่อ</p>
            <p className="py-1 text-sm text-muted-foreground">hello@mapleleaf.example</p>
            <p className="py-1 text-sm text-muted-foreground">02-000-0000</p>
            <p className="py-1 text-sm text-muted-foreground">กรุงเทพฯ · โตรอนโต</p>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © 2026 MapleLeaf Education. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export const studentNav = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/profile", label: "Profile" },
  { to: "/student/interests", label: "Study Interests" },
  { to: "/student/language-test", label: "Language Test" },
  { to: "/student/courses", label: "Courses" },
  { to: "/student/applications", label: "My Applications" },
  { to: "/student/documents", label: "Documents" },
  { to: "/student/offers", label: "Offer & Invoice" },
  { to: "/student/payments", label: "Payment" },
  { to: "/student/notifications", label: "Notifications" },
];

export const agentNav = [
  { to: "/agent/dashboard", label: "Dashboard" },
  { to: "/agent/applications", label: "Applications" },
  { to: "/agent/documents", label: "Documents" },
  { to: "/agent/offers", label: "Offers & Invoices" },
  { to: "/agent/payments", label: "Payments" },
  { to: "/agent/notifications", label: "Notifications" },
  { to: "/agent/profile", label: "Profile" },
];

export const collegeNav = [
  { to: "/college/dashboard", label: "Dashboard" },
  { to: "/college/applications", label: "Applications" },
  { to: "/college/courses", label: "Courses" },
  { to: "/college/documents", label: "Documents" },
  { to: "/college/offers", label: "Offers & Invoices" },
  { to: "/college/payments", label: "Payments" },
  { to: "/college/notifications", label: "Notifications" },
  { to: "/college/profile", label: "Profile" },
];

export const adminNav = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/accounts", label: "จัดการบัญชี" },
];

export function DashboardLayout({
  nav,
  children,
  title,
}: {
  nav: { to: string; label: string }[];
  children: ReactNode;
  title: string;
}) {
  const { me, logout, unread } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(!open)} className="rounded-lg border border-border p-2 lg:hidden">
              <span className="sr-only">Menu</span>
              <div className="space-y-1">
                <span className="block h-0.5 w-5 bg-foreground" />
                <span className="block h-0.5 w-5 bg-foreground" />
                <span className="block h-0.5 w-5 bg-foreground" />
              </div>
            </button>
            <Logo />
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="primary">{me?.role?.toUpperCase()}</Badge>
            {unread > 0 && <Badge tone="danger">{unread} ใหม่</Badge>}
            <span className="hidden text-sm text-muted-foreground sm:block">{me?.email}</span>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="container-page flex gap-6 py-6">
        <aside className={cn("w-60 shrink-0", open ? "block" : "hidden", "lg:block")}>
          <nav className="sticky top-24 space-y-1 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
            {nav.map((n) => (
              <ALink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition",
                  path === n.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {n.label}
              </ALink>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
