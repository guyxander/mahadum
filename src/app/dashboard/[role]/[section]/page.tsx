import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/dashboard-content";
import { nav } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/dashboard";

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ role: string; section: string }>; searchParams: Promise<{ course?: string; step?: string }> }) {
  const { role, section } = await params;
  const query = await searchParams;
  if (!(role in nav)) notFound();
  const client=await createClient();
  let canAdmin=false;
  if(client){const {data:{user}}=await client.auth.getUser();if(!user)redirect("/login");const {data:roles}=await client.from("user_roles").select("role").eq("user_id",user.id);const granted=new Set((roles||[]).map(item=>item.role));canAdmin=granted.has("admin");if(role==="admin"&&!canAdmin)notFound();if(role==="creator"&&!granted.has("creator")&&!canAdmin)notFound();if(role==="learner"&&!granted.has("learner")&&!canAdmin)notFound();}
  const data=await loadDashboard(role);if(!data)redirect("/login");
  return <AppShell role={role as keyof typeof nav} section={section} name={data.name} canAdmin={canAdmin}><DashboardContent role={role} section={section} data={data} builderCourseId={query.course} wizardStep={query.step}/></AppShell>;
}
