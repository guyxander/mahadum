"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const client = await createClient();
  if (!client) redirect("/login?error=Supabase+is+not+configured");
  const { error } = await client.auth.signInWithPassword({ email:String(formData.get("email")||""), password:String(formData.get("password")||"") });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  const {data:roles}=await client.from("user_roles").select("role");const granted=new Set((roles||[]).map(item=>item.role));
  redirect(granted.has("admin")?"/dashboard/admin/overview":granted.has("creator")?"/dashboard/creator/overview":"/dashboard/learner/my-learning");
}

export async function signUp(formData: FormData) {
  const client = await createClient();
  if (!client) redirect("/signup?error=Supabase+is+not+configured");
  const email=String(formData.get("email")||""); const password=String(formData.get("password")||""); const fullName=String(formData.get("name")||"");
  const requestedRole=formData.get("role")==="creator"?"creator":"learner";
  const { error } = await client.auth.signUp({ email, password, options:{ data:{ full_name:fullName,requested_role:requestedRole },emailRedirectTo:`${process.env.NEXT_PUBLIC_SITE_URL||"https://mahadum.vercel.app"}/login?message=Email+confirmed` } });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Check+your+email+to+confirm+your+account");
}

export async function signOut(){const client=await createClient();if(client)await client.auth.signOut();redirect("/")}

export async function requestPasswordReset(formData:FormData){
  const client=await createClient();if(!client)redirect("/forgot-password?error=Supabase+is+not+configured");
  const email=String(formData.get("email")||"");
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL||"https://mahadum.vercel.app"}/reset-password`});
  if(error)redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  redirect("/forgot-password?message=Check+your+email+for+the+recovery+link");
}

export async function updatePassword(formData:FormData){
  const client=await createClient();if(!client)redirect("/reset-password?error=Supabase+is+not+configured");
  const password=String(formData.get("password")||"");const confirm=String(formData.get("confirm")||"");
  if(password!==confirm)redirect("/reset-password?error=Passwords+do+not+match");
  const {error}=await client.auth.updateUser({password});if(error)redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard/learner/my-learning");
}
