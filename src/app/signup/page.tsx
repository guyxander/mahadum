import Link from "next/link";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ ref?: string; next?: string }> }) {
  const { ref, next: requestedNext } = await searchParams;
  const referrer = /^[a-z0-9-]{4,24}$/.test(ref || "") ? ref : "";
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard/learner/my-learning";
  const creatorJourney = next.startsWith("/dashboard/creator");
  return <main className="auth-page auth-page-google auth-signup-page">
    <section className="auth-brand">
      <Link className="brand" href="/" aria-label="Mahadum home"><span className="brand-mark">M</span> Mahadum</Link>
      <div className="auth-brand-copy">
        <span className="overline light">{creatorJourney ? "Your Creator Hub awaits" : "Learn without limits"}</span>
        <h1>{creatorJourney ? "Turn what you know into impact." : "Build skills that move you forward."}</h1>
        <p>{creatorJourney ? "Create practical courses, reach learners, and grow your income—all from one Mahadum account." : "Learn practical skills, teach what you know, and grow with one simple account."}</p>
        <div className="auth-brand-proof" aria-label="Mahadum benefits">
          <span><b>01</b> Learn practical skills</span>
          <span><b>02</b> Publish your expertise</span>
          <span><b>03</b> Earn from your audience</span>
        </div>
      </div>
      <small>Built for ambitious Africans.</small>
    </section>
    <section className="auth-form">
      <div className="auth-google-card auth-signup-card">
        <Link className="auth-back-link" href="/">← Back to Mahadum</Link>
        <span className="auth-welcome-mark">{creatorJourney ? "Creator account" : "Your Mahadum account"}</span>
        <h2>{creatorJourney ? "Start teaching on Mahadum" : "Create your Mahadum account"}</h2>
        <p>Continue with Google. Your account gives you access to both learning and teaching.</p>
        <GoogleAuthButton label="Continue with Google" next={next} referrer={referrer}/>
        <div className="auth-security-note"><span aria-hidden="true">✓</span><p>Secure Google authentication. Mahadum never sees or stores your Google password.</p></div>
        <div className="auth-account-note"><span aria-hidden="true">↗</span><p><b>Already have an account?</b><br/>Use the same Google button to sign in—no separate password needed.</p></div>
        <p className="auth-switch">By continuing, you agree to our <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</p>
      </div>
    </section>
  </main>;
}
