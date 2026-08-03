import Link from "next/link";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ ref?: string; next?: string }> }) {
  const { ref, next: requestedNext } = await searchParams;
  const referrer = /^[a-z0-9-]{4,24}$/.test(ref || "") ? ref : "";
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard/learner/my-learning";
  return <main className="auth-page"><section className="auth-brand"><Link className="brand" href="/"><span className="brand-mark">M</span> Mahadum</Link><div><span className="overline light">Join Mahadum</span><h1>One account for learning and teaching.</h1><p>Discover courses, share your expertise, and earn from one unified account.</p></div><small>Google-secured registration.</small></section><section className="auth-form"><div><h2>Create or continue your account</h2><p>Use Google to access both the learning space and Creator Hub.</p><GoogleAuthButton label="Continue with Google" next={next} referrer={referrer}/><p className="auth-switch">Already registered? The same Google button signs you in.</p></div></section></main>;
}
