import Link from "next/link";

export function PublicMobileNav() {
  return <details className="mobile-menu"><summary aria-label="Open navigation menu"><span aria-hidden="true" /></summary><nav aria-label="Mobile navigation"><Link href="/courses">Explore courses</Link><Link href="/courses#categories">Categories</Link><Link href="/signup?role=creator">For creators</Link><Link href="/login">Log in</Link><Link className="mobile-menu-primary" href="/signup">Get started</Link></nav></details>;
}
