"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const client = await createClient();
  if (client) await client.auth.signOut();
  redirect("/");
}

export async function signInWithGoogle(formData: FormData) {
  const client = await createClient();
  if (!client) redirect("/login?message=Google+sign-in+is+temporarily+unavailable");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://mahadum.vercel.app";
  const requestedNext = String(formData.get("next") || "/dashboard/learner/my-learning");
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard/learner/my-learning";
  const candidate = String(formData.get("referrer") || "");
  const referrer = /^[a-z0-9-]{4,24}$/.test(candidate) ? candidate : "";
  const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}&ref=${encodeURIComponent(referrer)}` } });
  if (error || !data.url) {
    console.error("[auth/google] OAuth start failed", { code: error?.code, status: error?.status });
    redirect(`/login?message=${encodeURIComponent(error?.message || "Google sign-in could not start")}`);
  }
  redirect(data.url);
}
