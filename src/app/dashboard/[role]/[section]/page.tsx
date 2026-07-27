import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/dashboard-content";
import { nav } from "@/lib/demo-data";

export default async function DashboardPage({ params }: { params: Promise<{ role: string; section: string }> }) {
  const { role, section } = await params;
  if (!(role in nav)) notFound();
  return <AppShell role={role as keyof typeof nav} section={section}><DashboardContent role={role} section={section}/></AppShell>;
}
