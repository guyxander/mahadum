import Link from "next/link";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; next?: string }> }) {
  const { message, next: requestedNext } = await searchParams;
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : undefined;
  return <main className="auth-page"><section className="auth-brand"><Link className="brand" href="/"><span className="brand-mark">M</span> Mahadum</Link><div><span className="overline light">One Mahadum account</span><h1>Learn what you need. Teach what you know.</h1><p>Your account includes both the learning space and Creator Hub.</p></div><small>Google-secured access.</small></section><section className="auth-form"><div><h2>Continue to Mahadum</h2><p>Sign in or create your account securely with Google.</p>{message&&<div className="auth-notice" role="status">{message}</div>}<GoogleAuthButton next={next}/><p className="auth-switch">By continuing, you agree to Mahadum’s <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</p></div></section></main>;
}
