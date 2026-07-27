import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorEntryPage() {
  const client = await createClient();
  if (!client) redirect("/signup?role=creator");
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/signup?role=creator");
  const { data: role } = await client.from("user_roles").select("role").eq("user_id", user.id).eq("role", "creator").maybeSingle();
  redirect(role ? "/dashboard/creator/overview" : "/signup?role=creator");
}
