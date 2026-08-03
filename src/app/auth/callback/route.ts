import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") || "/";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const referrer = /^[a-z0-9-]{4,24}$/.test(url.searchParams.get("ref") || "") ? url.searchParams.get("ref")! : "";

  if (code) {
    const client = await createClient();
    if (client) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        try {
          const { data: { user } } = await client.auth.getUser();
          if (user) {
            const admin = createAdminClient();
            await admin.from("user_roles").upsert({ user_id: user.id, role: "creator" }, { onConflict: "user_id,role" });
            await admin.from("creator_profiles").upsert({ user_id: user.id, display_name: user.user_metadata.full_name || user.user_metadata.name || "New creator", headline: "Creator", verification_status: "verified", verified_at: new Date().toISOString() }, { onConflict: "user_id", ignoreDuplicates: true });

            const recentlyCreated = Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000;
            if (referrer && recentlyCreated) {
              const { data: parent } = await admin.from("affiliates").select("user_id").eq("code", referrer).eq("status", "approved").maybeSingle();
              if (parent?.user_id && parent.user_id !== user.id) {
                await admin.from("affiliates").update({ parent_affiliate_id: parent.user_id }).eq("user_id", user.id).is("parent_affiliate_id", null);
              }
            }
          }
        } catch (setupError) {
          console.error("[auth/callback] account setup failed", { message: setupError instanceof Error ? setupError.message : "unknown" });
        }
        return NextResponse.redirect(new URL(next, url.origin));
      }
      console.error("[auth/callback] code exchange failed", { code: error.code, status: error.status });
    }
  }

  const message = url.searchParams.get("error_description") || "This sign-in link is invalid or expired. Please try again.";
  return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(message)}`, url.origin));
}
