"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const client = await createClient();
  if (!client) redirect("/login?error=Supabase+is+not+configured");
  const { error } = await client.auth.signInWithPassword({ email:String(formData.get("email")||""), password:String(formData.get("password")||"") });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard/learner/my-learning");
}

export async function signUp(formData: FormData) {
  const client = await createClient();
  if (!client) redirect("/signup?error=Supabase+is+not+configured");
  const email=String(formData.get("email")||""); const password=String(formData.get("password")||""); const fullName=String(formData.get("name")||"");
  const { error } = await client.auth.signUp({ email, password, options:{ data:{ full_name:fullName } } });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Check+your+email+to+confirm+your+account");
}
