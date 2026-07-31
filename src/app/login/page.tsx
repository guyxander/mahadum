import Link from "next/link";
import {LoginForm} from "@/components/login-form";
import {GoogleAuthButton} from "@/components/google-auth-button";

export default async function LoginPage({searchParams}:{searchParams:Promise<{message?:string}>}){const {message}=await searchParams;return <main className="auth-page"><section className="auth-brand"><Link className="brand" href="/"><span className="brand-mark">M</span> Mahadum</Link><div><span className="overline light">Learning without limits</span><h1>Welcome back to your next chapter.</h1><p>Learn practical skills from creators who have done the work.</p></div><small>Creator-first. Learner-focused.</small></section><section className="auth-form"><div><h2>Log in</h2><p>Enter your details to continue.</p>{message&&<div className="auth-notice" role="status">{message}</div>}<GoogleAuthButton/><LoginForm/><p className="auth-switch">New to Mahadum? <Link href="/signup">Create an account</Link></p></div></section></main>}
