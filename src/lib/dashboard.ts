import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPaystackBanks, type PaystackBank } from "@/lib/payments/paystack";

export type Row = Record<string, unknown>;
export type DashboardData = {
  generatedAt: number;
  userId: string;
  name: string;
  email: string;
  profile: Row | null;
  creatorContact: Row | null;
  payoutAccount: Row | null;
  payoutBanks: PaystackBank[];
  categories: Row[];
  courses: Row[];
  marketplaceCourses: Row[];
  enrollments: Row[];
  progress: Row[];
  certificates: Row[];
  reviews: Row[];
  users: Row[];
  creators: Row[];
  payments: Row[];
  refunds: Row[];
  payouts: Row[];
  ledger: Row[];
  affiliates: Row[];
  referrals: Row[];
  audit: Row[];
  settings: Row[];
};
const rows = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);

export async function loadDashboard(role: string) {
  const client = await createClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const catalogueClient = createAdminClient();
  const base: DashboardData = {
    generatedAt: Date.now(),
    userId: user.id,
    name: String(
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Member",
    ),
    email: user.email || "",
    profile: null,
    creatorContact: null,
    payoutAccount: null,
    payoutBanks: [],
    categories: [],
    courses: [],
    marketplaceCourses: [],
    enrollments: [],
    progress: [],
    certificates: [],
    reviews: [],
    users: [],
    creators: [],
    payments: [],
    refunds: [],
    payouts: [],
    ledger: [],
    affiliates: [],
    referrals: [],
    audit: [],
    settings: [],
  };
  const [
    { data: profile },
    { data: creatorContact },
    { data: categories },
    { data: affiliateRows },
    { data: referralRows },
    { data: publishedCourses },
  ] = await Promise.all([
    client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    client
      .from("creator_contacts")
      .select("whatsapp_number")
      .eq("user_id", user.id)
      .maybeSingle(),
    client.from("categories").select("*").order("sort_order"),
    client.from("affiliates").select("*").eq("user_id", user.id),
    client
      .from("referrals")
      .select("*")
      .eq("affiliate_id", user.id)
      .order("attributed_at", { ascending: false }),
    catalogueClient
      .from("courses")
      .select(
        "id,title,slug,short_description,thumbnail_path,price_minor,currency,affiliate_bonus_bps,published_at,payments(count)",
      )
      .eq("status", "published")
      .eq("payments.status", "successful")
      .order("published_at", { ascending: false }),
  ]);
  base.profile = profile as Row | null;
  base.creatorContact = creatorContact as Row | null;
  base.categories = rows(categories);
  base.name = String(profile?.full_name || base.name);
  base.affiliates = rows(affiliateRows);
  base.referrals = rows(referralRows);
  base.marketplaceCourses = rows(publishedCourses).sort((a, b) => {
    const sales = (row: Row) => Number(rows(row.payments)[0]?.count || 0);
    const salesDifference = sales(b) - sales(a);
    if (salesDifference !== 0) return salesDifference;
    return String(b.published_at || "").localeCompare(String(a.published_at || ""));
  });
  if (role === "creator") {
    const results = await Promise.all([
      client
        .from("courses")
        .select(
          "*, categories(name), course_modules(id,title,position,lessons(id,title,description,video_url,duration_seconds,position,is_free_preview))",
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
      client
        .from("ledger_entries")
        .select("*, payments(tx_ref,courses(title))")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      client
        .from("payouts")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false }),
      client
        .from("payout_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    [base.courses, base.ledger, base.payouts] = results
      .slice(0, 3)
      .map((x) => rows(x.data));
    base.payoutAccount = (results[3].data as Row | null) || null;
    if (process.env.PAYSTACK_SECRET_KEY)
      base.payoutBanks = await listPaystackBanks(
        process.env.PAYSTACK_SECRET_KEY,
      );
  } else if (role === "learner") {
    const results = await Promise.all([
      client
        .from("enrollments")
        .select(
          "*, courses(id,title,slug,short_description,course_modules(id,lessons(id,title,position)))",
        )
        .eq("learner_id", user.id)
        .order("enrolled_at", { ascending: false }),
      client
        .from("lesson_progress")
        .select("*")
        .order("updated_at", { ascending: false }),
      client
        .from("certificates")
        .select("*, enrollments!inner(learner_id,completed_at,courses(title))")
        .eq("enrollments.learner_id", user.id),
      client
        .from("payments")
        .select("*, courses(title)")
        .eq("learner_id", user.id)
        .order("created_at", { ascending: false }),
      client
        .from("courses")
        .select("*, categories(name)")
        .eq("status", "published")
        .order("published_at", { ascending: false }),
      client.from("reviews").select("*").eq("learner_id", user.id),
    ]);
    [
      base.enrollments,
      base.progress,
      base.certificates,
      base.payments,
      base.courses,
      base.reviews,
    ] = results.map((x) => rows(x.data));
  } else {
    const admin = createAdminClient();
    const [profilesResult, rolesResult, authResult, ...results] =
      await Promise.all([
        client
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        client.from("user_roles").select("user_id,role"),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        client
          .from("courses")
          .select(
            "*, categories(name), profiles!courses_creator_id_fkey(full_name), enrollments(count)",
          )
          .order("created_at", { ascending: false }),
        client
          .from("creator_profiles")
          .select("*, profiles(full_name)")
          .order("verification_status"),
        client
          .from("payments")
          .select("*, courses(title)")
          .order("created_at", { ascending: false }),
        client
          .from("refunds")
          .select("*, payments(tx_ref)")
          .order("created_at", { ascending: false }),
        client
          .from("payouts")
          .select("*, profiles(full_name)")
          .order("requested_at", { ascending: false }),
        client
          .from("ledger_entries")
          .select("*")
          .order("created_at", { ascending: false }),
        client
          .from("affiliates")
          .select("*, profiles(full_name)")
          .order("status"),
        client
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        client.from("platform_settings").select("*").order("key"),
      ]);
    if (profilesResult.error) throw profilesResult.error;
    if (rolesResult.error) throw rolesResult.error;
    if (authResult.error) throw authResult.error;
    const roleRows = rows(rolesResult.data);
    const emails = new Map(
      authResult.data.users.map((item) => [item.id, item.email || ""]),
    );
    base.users = rows(profilesResult.data).map((profile) => ({
      ...profile,
      email: emails.get(String(profile.id)) || "",
      user_roles: roleRows.filter((roleRow) => roleRow.user_id === profile.id),
    }));
    [
      base.courses,
      base.creators,
      base.payments,
      base.refunds,
      base.payouts,
      base.ledger,
      base.affiliates,
      base.audit,
      base.settings,
    ] = results.map((x) => rows(x.data));
  }
  return base;
}
