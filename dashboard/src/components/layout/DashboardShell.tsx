"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, BriefcaseBusiness, ChevronDown, ChevronLeft, ChevronRight, CreditCard,
  FileCheck2, FileClock, FileText, FolderOpen, Headphones, LayoutDashboard,
  LogOut, Menu, Moon, Package, Search, Settings, Sun, Users,
  UserRound, Wallet, X, PanelsTopLeft, Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PreviewRole } from "@/lib/permissions";
import { useClientDemo } from "@/components/dashboard/ClientDemoContext";

type NavItem = { label: string; slug: string; icon: LucideIcon };

const adminNav: NavItem[] = [
  { label: "Dashboard", slug: "dashboard", icon: LayoutDashboard },
  { label: "Applications", slug: "applications", icon: FileClock },
  { label: "Clients", slug: "clients", icon: Users },
  { label: "Orders", slug: "orders", icon: Package },
  { label: "Documents", slug: "documents", icon: FolderOpen },
  { label: "Payments", slug: "payments", icon: Wallet },
  { label: "Services & Pricing", slug: "services", icon: BriefcaseBusiness },
  { label: "Website Content", slug: "website-content", icon: PanelsTopLeft },
  { label: "Notifications", slug: "notifications", icon: Bell },
  { label: "Settings", slug: "settings", icon: Settings },
];
const clientNav: NavItem[] = [
  { label: "Dashboard", slug: "dashboard", icon: LayoutDashboard },
  { label: "My Companies", slug: "companies", icon: Building2 },
  { label: "My Applications", slug: "applications", icon: FileCheck2 },
  { label: "Orders", slug: "orders", icon: Package },
  { label: "Documents", slug: "documents", icon: FileText },
  { label: "Payments", slug: "payments", icon: CreditCard },
  { label: "Additional Services", slug: "services", icon: BriefcaseBusiness },
  { label: "Support", slug: "support", icon: Headphones },
  { label: "Profile", slug: "profile", icon: UserRound },
  { label: "Settings", slug: "settings", icon: Settings },
];

function ClientCompanySwitcher() {
  const { companyId, setCompanyId, applications } = useClientDemo();
  const companies = [...new Map(applications.map((item) => [item.companyId, item.company])).values()];
  if (!companies.length) return null;
  return <label className="header-company-switch"><span>Company</span><select aria-label="Select company" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>;
}

export function DashboardShell({ role, title, children }: { role: PreviewRole; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<{ fullName: string; email: string; emailVerified?: boolean } | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; readAt: string | null }[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<"notifications" | "profile" | "sidebar-profile" | null>(null);
  const nav = role === "admin" ? adminNav : clientNav;
  const found = useMemo(() => nav.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())).slice(0, 5), [nav, search]);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/auth/current", { cache: "no-store" }).then((response) => response.json()).then((result) => { if (active) setProfile(result.user ?? null); }).catch(() => {});
    void fetch(`/api/v1/${role === "admin" ? "admin" : "client"}/notifications`, { cache: "no-store" }).then((response) => response.json()).then((result) => { if (active) setNotifications(result.notifications ?? []); }).catch(() => {});
    return () => { active = false; };
  }, [role]);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    router.replace("/login");
    router.refresh();
  }

  async function resendVerification() {
    const response = await fetch("/api/v1/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const result = await response.json();
    window.alert(response.ok ? result.message : result.error ?? "Could not request verification email.");
  }

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setOpenMenu(null);
        setSearch("");
      }
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    try { if (localStorage.getItem("apex-dashboard-sidebar") === "collapsed") queueMicrotask(() => setCollapsed(true)); } catch {}
  }, []);

  useEffect(() => {
    if (!drawerOpen || !window.matchMedia("(max-width: 900px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [drawerOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onResize = () => { if (!media.matches) { setDrawerOpen(false); setOpenMenu(null); } };
    media.addEventListener("change", onResize);
    return () => media.removeEventListener("change", onResize);
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      try { localStorage.setItem("apex-dashboard-sidebar", current ? "expanded" : "collapsed"); } catch {}
      return !current;
    });
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.dashboardTheme !== "dark";
    document.documentElement.dataset.dashboardTheme = next ? "dark" : "light";
    try { localStorage.setItem("apex-dashboard-theme", next ? "dark" : "light"); } catch {}
  }

  const sidebar = (
    <>
      <div className="sidebar-brand">
        <Link href={"/" + role + "/dashboard"} className="brand-link" aria-label="Apex Filings dashboard home">
          <Image src="/apex-icon.png" alt="" className="brand-icon" width={38} height={38} />
          <span className="brand-name">Apex Filings<span className="brand-subtitle">DASHBOARD</span></span>
        </Link>
        <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={19} /></button>
      </div>
      <nav className="sidebar-nav" aria-label={role === "admin" ? "Admin navigation" : "Client navigation"}>
        {nav.map((item, index) => {
          const Icon = item.icon;
          const href = "/" + role + "/" + item.slug;
          const active = pathname === href || (pathname.startsWith(href + "/") && item.slug !== "dashboard");
          const adminGroup = role === "admin" ? ({ 0: "Overview", 1: "Operations", 6: "Management", 9: "Account" } as Record<number, string>)[index] : undefined;
          const clientGroup = role === "client" ? ({ 0: "Workspace", 5: "Services", 8: "Account" } as Record<number, string>)[index] : undefined;
          return <Fragment key={item.slug}>{(adminGroup || clientGroup) && <span className="sidebar-group-heading">{adminGroup || clientGroup}</span>}<Link href={href} className={"nav-item" + (active ? " active" : "")} onClick={() => { setDrawerOpen(false); setOpenMenu(null); }} title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span></Link></Fragment>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-account-anchor">
          <button className="sidebar-account" aria-label="Open account menu" aria-expanded={openMenu === "sidebar-profile"} onClick={() => setOpenMenu(openMenu === "sidebar-profile" ? null : "sidebar-profile")} title={collapsed ? "Account" : undefined}>
            <span className="avatar">{profile?.fullName?.charAt(0).toUpperCase() ?? "A"}</span>
            <span className="sidebar-account-copy"><strong>{profile?.fullName ?? "Account"}</strong><small>{role === "admin" ? "Owner / Admin" : "Client"}</small></span>
            <ChevronDown className="sidebar-account-chevron" size={16} />
          </button>
          {openMenu === "sidebar-profile" && <div className="sidebar-account-menu"><span>{profile?.email ?? "Account"}</span><Link href={"/" + role + (role === "admin" ? "/settings" : "/profile")} onClick={() => { setOpenMenu(null); setDrawerOpen(false); }}>Profile & settings</Link><button onClick={() => void logout()}><LogOut size={16} /> Log out</button></div>}
        </div>
      </div>
    </>
  );

  return (
    <div className={"dashboard-app role-" + role + (collapsed ? " is-collapsed" : "")}>
      {drawerOpen && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
      <aside className={"sidebar" + (drawerOpen ? " mobile-open" : "")}>{sidebar}</aside>
      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button desktop-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar}>{collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</button>
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}><Menu size={22} /></button>
            <span className="topbar-crumb">{role === "admin" ? "Admin" : "Client"} <ChevronRight size={14} /> <strong>{title}</strong></span>
          </div>
          <div className="topbar-actions">
            {role === "client" && <ClientCompanySwitcher />}
            <div className="topbar-search">
              <Search size={17} />
              <input aria-label="Search navigation" placeholder="Search pages..." value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && <div className="search-results"><span className="eyebrow">NAVIGATION</span>{found.length ? found.map((item) => <Link key={item.slug} href={"/" + role + "/" + item.slug} onClick={() => setSearch("")}>{item.label}<ChevronRight size={15} /></Link>) : <p>No matching page.</p>}</div>}
            </div>
            <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme" title="Toggle color theme"><Sun className="theme-sun" size={19} /><Moon className="theme-moon" size={19} /></button>
            <div className="menu-anchor">
              <button className="icon-button notification-button" aria-label={`Notifications, ${notifications.filter((item) => !item.readAt).length} unread`} aria-expanded={openMenu === "notifications"} onClick={() => setOpenMenu(openMenu === "notifications" ? null : "notifications")}><Bell size={19} />{notifications.some((item) => !item.readAt) && <span className="notification-dot" />}</button>
              {openMenu === "notifications" && <div className="topbar-popover"><strong>Notifications · {notifications.filter((item) => !item.readAt).length} unread</strong>{notifications.length ? notifications.slice(0, 3).map((item) => <p key={item.id}><strong>{item.title}</strong><br />{item.message}</p>) : <p>No notifications yet.</p>}<Link href={`/${role}/notifications`} onClick={() => setOpenMenu(null)}>View all <ChevronRight size={15} /></Link></div>}
            </div>
            <div className="menu-anchor">
              <button className="profile-trigger" aria-label="Open profile menu" aria-expanded={openMenu === "profile"} onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}><span className="avatar">{profile?.fullName?.charAt(0).toUpperCase() ?? "A"}</span><span className="profile-label"><strong>{profile?.fullName ?? "Account"}</strong><small>{role === "admin" ? "Owner / Admin" : "Client"}</small></span><ChevronDown size={15} /></button>
              {openMenu === "profile" && <div className="topbar-popover profile-popover"><span className="eyebrow">{profile?.email ?? "ACCOUNT"}</span><Link href={"/" + role + (role === "admin" ? "/settings" : "/profile")}>Profile & settings</Link><button onClick={() => void logout()}>Log out</button></div>}
            </div>
          </div>
        </header>
        {profile?.emailVerified === false && <div className="preview-strip" role="status">Verify your email before submitting an application. <button className="table-link" onClick={() => void resendVerification()}>Resend verification email</button></div>}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
