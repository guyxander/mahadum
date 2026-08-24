import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { courseId?: string; eventType?: string; affiliateCode?: string } | null;
  if (!body || !/^[0-9a-f-]{36}$/i.test(body.courseId || "") || !["copy", "visit"].includes(body.eventType || ""))
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id").eq("id", body.courseId!).eq("status", "published").maybeSingle();
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  let affiliateId: string | null = null;
  if (body.affiliateCode) {
    const { data: affiliate } = await admin.from("affiliates").select("user_id").eq("code", body.affiliateCode).eq("status", "approved").maybeSingle();
    affiliateId = affiliate?.user_id || null;
  }
  if (body.eventType === "copy") {
    const client = await createClient();
    const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } };
    if (!user || affiliateId !== user.id) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const { error } = await admin.from("course_link_events").insert({ course_id: course.id, affiliate_id: affiliateId, event_type: body.eventType });
  if (error) return NextResponse.json({ error: "Could not record analytics." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
