import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { PublicMobileNav } from "@/components/public-mobile-nav";

export async function PublicHeader({courseBack=false}:{courseBack?:boolean}) {
  const client=await createClient();
  const {data:{user}}=client?await client.auth.getUser():{data:{user:null}};
  const {data:assignedRoles}=user&&client?await client.from("user_roles").select("role").eq("user_id",user.id):{data:null};
  const grants=new Set((assignedRoles||[]).map(item=>item.role));
  const role=grants.has("admin")?"admin":grants.has("creator")?"creator":"learner";
  const dashboardHref=user?`/dashboard/${role}/${role==="learner"?"my-learning":"overview"}`:undefined;
  return <header className="site-header"><Link className="brand" href="/" aria-label="Mahadum home"><span className="brand-mark">M</span> Mahadum</Link><nav className="desktop-nav" aria-label="Primary navigation">{courseBack?<Link href="/courses">← All courses</Link>:<><Link href="/courses">Explore</Link><Link href="/courses#categories">Categories</Link><Link href="/signup?role=creator">For creators</Link></>}</nav><div className="header-actions">{user?<><Link className="login" href={dashboardHref!}>My dashboard</Link><form className="header-signout" action={signOut}><button>Sign out</button></form></>:<><Link className="login" href="/login">Log in</Link><Link className="button button-small" href="/signup">Get started</Link></>}<PublicMobileNav dashboardHref={dashboardHref} /></div></header>;
}
