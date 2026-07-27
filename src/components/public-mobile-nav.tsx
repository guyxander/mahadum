import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export function PublicMobileNav({ dashboardHref }: { dashboardHref?: string }) {
  return (
    <details className="mobile-menu">
      <summary aria-label="Open navigation menu">
        <span aria-hidden="true" />
      </summary>
      <nav aria-label="Mobile navigation">
        <Link href="/courses">Explore courses</Link>
        <Link href="/courses#categories">Categories</Link>
        <Link href="/creator">For creators</Link>
        {dashboardHref ? (
          <>
            <Link className="mobile-menu-primary" href={dashboardHref}>
              My dashboard
            </Link>
            <form action={signOut}>
              <button>Sign out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link className="mobile-menu-primary" href="/signup">
              Get started
            </Link>
          </>
        )}
      </nav>
    </details>
  );
}
