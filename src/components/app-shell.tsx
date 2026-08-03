import Link from "next/link";
import { nav } from "@/lib/navigation";
import { signOut } from "@/app/auth/actions";

type Role = keyof typeof nav;
type WorkspaceLink = { href:string; label:string };

export function AppShell({ role, section, name, canAdmin=false, children }: { role: Role; section: string; name:string; canAdmin?:boolean; children: React.ReactNode }) {
  const workspaceLinks: WorkspaceLink[] = role === "admin"
    ? [{ href: "/dashboard/learner/my-learning", label: "Learning space" }, { href: "/dashboard/creator/overview", label: "Creator Hub" }]
    : [
        { href: role === "creator" ? "/dashboard/learner/my-learning" : "/dashboard/creator/overview", label: role === "creator" ? "Switch to learning" : "Switch to Creator Hub" },
        ...(canAdmin ? [{ href: "/dashboard/admin/overview", label: "Admin Console" }] : []),
      ];
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark">M</span> Mahadum</Link>
      <span className="mobile-section-title">{section.replaceAll("-", " ")}</span>
      <details className="dashboard-mobile-menu"><summary aria-label="Open dashboard menu"><span aria-hidden="true" /></summary><nav aria-label="Dashboard navigation">{nav[role].map((item) => { const slug = item.toLowerCase().replaceAll(" ", "-"); return <Link className={section === slug ? "active" : ""} href={`/dashboard/${role}/${slug}`} key={item}>{item}</Link>; })}{workspaceLinks.map(link=><Link href={link.href} key={link.href}>{link.label}</Link>)}<Link href="/">Marketplace</Link><form action={signOut}><button>Sign out</button></form></nav></details>
      <div className="workspace-label">{role === "creator" ? "Creator Hub" : role === "admin" ? "Admin console" : "Learning space"}</div>
      <nav>{nav[role].map((item) => { const slug = item.toLowerCase().replaceAll(" ", "-"); return <Link className={section === slug ? "active" : ""} href={`/dashboard/${role}/${slug}`} key={item}><span>{item.slice(0,1)}</span>{item}</Link>; })}</nav>
      <div className="sidebar-foot">{workspaceLinks.map(link=><Link href={link.href} key={link.href}>{link.label}</Link>)}<Link href="/">← Marketplace</Link><form action={signOut}><button>Sign out</button></form></div>
    </aside>
    <div className="app-main"><header className="app-topbar"><div><span className="mobile-logo">M</span><b>{section.replaceAll("-", " ")}</b></div><div className="topbar-actions"><span className="user-avatar">{name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</span><div><b>{name}</b><small>{role}</small></div></div></header>{children}</div>
  </div>;
}
