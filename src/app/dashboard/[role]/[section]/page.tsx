import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/dashboard-content";
import { nav } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage({ params }: { params: Promise<{ role: string; section: string }> }) {
  const { role, section } = await params;
  if (!(role in nav)) notFound();
  const client=await createClient();
  if(client){const {data:{user}}=await client.auth.getUser();if(!user)redirect("/login");const {data:roles}=await client.from("user_roles").select("role").eq("user_id",user.id);const granted=new Set((roles||[]).map(item=>item.role));if(role==="admin"&&!granted.has("admin"))notFound();if(role==="creator"&&!granted.has("creator"))notFound();if(role==="learner"&&!granted.has("learner"))notFound();}
  return <AppShell role={role as keyof typeof nav} section={section}><DashboardContent role={role} section={section}/></AppShell>;
}
