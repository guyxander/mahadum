"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/auth/actions";

const initialState: LoginState = { error: "" };

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next || ""} />
      <label>
        Email address
        <input type="email" name="email" placeholder="you@example.com" autoComplete="email" required disabled={pending} />
      </label>
      <label>
        Password
        <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" required disabled={pending} />
      </label>
      <div className="form-options"><span /><Link href="/forgot-password">Forgot password?</Link></div>
      {state.error && <div className="auth-alert" role="alert">{state.error}</div>}
      <button className="button" type="submit" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
    </form>
  );
}
