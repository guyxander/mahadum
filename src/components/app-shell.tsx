import Link from "next/link";
import { nav } from "@/lib/navigation";
import { signOut } from "@/app/auth/actions";

type Role = keyof typeof nav;

export function AppShell({ role, section, name, children }: { role: Role; section: string; name:string; children: React.ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark">M</span> Mahadum</Link>
      <div className="workspace-label">{role === "creator" ? "Creator Hub" : role === "admin" ? "Admin console" : "Learning space"}</div>
      <nav>{nav[role].map((item) => { const slug = item.toLowerCase().replaceAll(" ", "-"); return <Link className={section === slug ? "active" : ""} href={`/dashboard/${role}/${slug}`} key={item}><span>{item.slice(0,1)}</span>{item}</Link>; })}</nav>
      <div className="sidebar-foot"><Link href="/">← Marketplace</Link><form action={signOut}><button>Sign out</button></form></div>
    </aside>
    <div className="app-main"><header className="app-topbar"><div><span className="mobile-logo">M</span><b>{section.replaceAll("-", " ")}</b></div><div className="topbar-actions"><span className="user-avatar">{name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</span><div><b>{name}</b><small>{role}</small></div></div></header>{children}</div>
  </div>;
}
