"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState={error:string};
export async function signIn(_state:LoginState,formData: FormData):Promise<LoginState> {
  const client = await createClient();
  if(!client)return {error:"Login is temporarily unavailable. Please try again shortly."};
  const email=String(formData.get("email")||"").trim().toLowerCase();const password=String(formData.get("password")||"");
  if(!email||!password)return {error:"Enter your email address and password."};
  const {error}=await client.auth.signInWithPassword({email,password});
  if(error){console.warn("[auth/login] rejected",{code:error.code,status:error.status});return {error:error.message};}
  const {data:roles,error:roleError}=await client.from("user_roles").select("role");if(roleError)console.error("[auth/login] role lookup failed",{code:roleError.code});const granted=new Set((roles||[]).map(item=>item.role));
  redirect(granted.has("admin")?"/dashboard/admin/overview":granted.has("creator")?"/dashboard/creator/overview":"/dashboard/learner/my-learning");
}

export async function signUp(formData: FormData) {
  const client = await createClient();
  if (!client) redirect("/signup?error=Supabase+is+not+configured");
  const email=String(formData.get("email")||""); const password=String(formData.get("password")||""); const fullName=String(formData.get("name")||"");
  const requestedRole=formData.get("role")==="creator"?"creator":"learner";
  const site=process.env.NEXT_PUBLIC_SITE_URL||"https://mahadum.vercel.app";
  const { error } = await client.auth.signUp({ email, password, options:{ data:{ full_name:fullName,requested_role:requestedRole },emailRedirectTo:`${site}/auth/callback?next=${encodeURIComponent("/login?message=Email confirmed. You can now log in.")}` } });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Check+your+email+to+confirm+your+account");
}

export async function signOut(){const client=await createClient();if(client)await client.auth.signOut();redirect("/")}

export async function signInWithGoogle(formData:FormData){
  const client=await createClient();
  if(!client)redirect("/login?message=Google+sign-in+is+temporarily+unavailable");
  const site=process.env.NEXT_PUBLIC_SITE_URL||"https://mahadum.vercel.app";
  const next=String(formData.get("next")||"/dashboard/learner/my-learning");
  const safeNext=next.startsWith("/")&&!next.startsWith("//")?next:"/dashboard/learner/my-learning";
  const role=formData.get("role")==="creator"?"creator":"learner";
  const {data,error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${site}/auth/callback?next=${encodeURIComponent(safeNext)}&role=${role}`}});
  if(error||!data.url){console.error("[auth/google] OAuth start failed",{code:error?.code,status:error?.status});redirect(`/login?message=${encodeURIComponent(error?.message||"Google sign-in could not start")}`);}
  redirect(data.url);
}

export async function requestPasswordReset(formData:FormData){
  const client=await createClient();if(!client)redirect("/forgot-password?error=Supabase+is+not+configured");
  const email=String(formData.get("email")||"");
  const site=process.env.NEXT_PUBLIC_SITE_URL||"https://mahadum.vercel.app";
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${site}/auth/callback?next=${encodeURIComponent("/reset-password")}`});
  if(error)redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  redirect("/forgot-password?message=Check+your+email+for+the+recovery+link");
}

export async function updatePassword(formData:FormData){
  const client=await createClient();if(!client)redirect("/reset-password?error=Supabase+is+not+configured");
  const {data:{user}}=await client.auth.getUser();if(!user)redirect("/forgot-password?error=Recovery+session+missing.+Request+a+new+link");
  const password=String(formData.get("password")||"");const confirm=String(formData.get("confirm")||"");
  if(password!==confirm)redirect("/reset-password?error=Passwords+do+not+match");
  const {error}=await client.auth.updateUser({password});if(error)redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  await client.auth.signOut();redirect("/login?message=Password+updated.+Log+in+with+your+new+password");
}
