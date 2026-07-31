"use server";

import { revalidatePath } from "next/cache";
import { youtubeVideoId } from "@/lib/youtube";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function context(required?: string) {
  const client = await createClient();
  if (!client) throw new Error("Supabase is not configured");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  if (required) {
    const { data } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", required)
      .maybeSingle();
    if (!data) throw new Error("Not authorized");
  }
  return { client, user };
}

export async function saveCourse(data: FormData) {
  const { client, user } = await context("creator");
  const id = text(data, "id");
  const title = text(data, "title");
  const learningOutcomes = text(data, "learning_outcomes")
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-•✓]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
  const payload = {
    creator_id: user.id,
    category_id: text(data, "category_id") || null,
    title,
    slug: `${slugify(title)}-${user.id.slice(0, 8)}`,
    short_description: text(data, "short_description"),
    description: text(data, "description"),
    learning_outcomes: learningOutcomes,
    price_minor: Math.round(Number(text(data, "price")) * 100),
    currency: "NGN",
  };
  if (
    !title ||
    !payload.short_description ||
    !payload.description ||
    learningOutcomes.length === 0 ||
    !Number.isFinite(payload.price_minor) ||
    payload.price_minor < 0
  )
    throw new Error("Complete all course fields and add at least one learning outcome");
  let courseId = id;
  if (id) {
    const { error } = await client
      .from("courses")
      .update(payload)
      .eq("id", id)
      .eq("creator_id", user.id);
    if (error) throw error;
  } else {
    const { data: course, error: courseError } = await client
      .from("courses")
      .insert(payload)
      .select("id")
      .single();
    if (courseError) throw courseError;
    courseId = course.id;
  }
  revalidatePath("/dashboard/creator/courses");
  revalidatePath("/dashboard/creator/course-builder");
  redirect(`/dashboard/creator/course-builder?course=${courseId}&step=modules`);
}
export async function submitCourse(data: FormData) {
  const { client, user } = await context("creator");
  const courseId = text(data, "id");
  const { data: modules } = await client.from("course_modules").select("id").eq("course_id", courseId);
  const moduleIds = (modules || []).map((module) => module.id);
  if (!moduleIds.length) throw new Error("Add at least one lesson before submitting your course.");
  const { data: lessons } = await client.from("lessons").select("video_url").in("module_id", moduleIds);
  if (!(lessons || []).some((lesson) => youtubeVideoId(lesson.video_url))) throw new Error("Add at least one valid YouTube lesson before submitting your course.");
  const { data: submitted, error } = await client
    .from("courses")
    .update({ status: "published", published_at: new Date().toISOString(), rejection_reason: null })
    .eq("id", courseId)
    .eq("creator_id", user.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!submitted) throw new Error("Only draft courses can be published.");
  revalidatePath("/dashboard/creator/courses");
  revalidatePath("/dashboard/creator/course-builder");
  revalidatePath("/courses");
  revalidatePath("/");
}
export async function deleteCourse(data: FormData) {
  const { client, user } = await context("creator");
  const { data: deleted, error } = await client
    .from("courses")
    .delete()
    .eq("id", text(data, "id"))
    .eq("creator_id", user.id)
    .in("status", ["draft", "rejected"])
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!deleted) throw new Error("This course cannot be deleted. Only your draft or rejected courses can be removed.");
  revalidatePath("/dashboard/creator/courses");
  revalidatePath("/dashboard/creator/course-builder");
  redirect("/dashboard/creator/courses");
}
export async function addModule(data: FormData) {
  const { client } = await context("creator");
  const courseId = text(data, "course_id");
  const { count } = await client
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);
  const { error } = await client
    .from("course_modules")
    .insert({
      course_id: courseId,
      title: text(data, "title"),
      position: count || 0,
    });
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}
export async function addLesson(data: FormData) {
  const { client } = await context("creator");
  const moduleId = text(data, "module_id");
  const { count } = await client
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);
  const videoUrl = text(data, "video_url");
  if (videoUrl && !youtubeVideoId(videoUrl)) throw new Error("Enter a valid YouTube video link.");
  const { error } = await client
    .from("lessons")
    .insert({
      module_id: moduleId,
      title: text(data, "title"),
      description: text(data, "description"),
      video_url: videoUrl || null,
      duration_seconds: Number(text(data, "duration_minutes") || 0) * 60,
      position: count || 0,
      is_free_preview: data.get("is_free_preview") === "on",
    });
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}

export async function addFirstLesson(data: FormData) {
  const { client, user } = await context("creator");
  const courseId = text(data, "course_id");
  const videoUrl = text(data, "video_url");
  if (!youtubeVideoId(videoUrl)) throw new Error("Enter a valid YouTube video link.");
  const { data: ownedCourse } = await client
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("creator_id", user.id)
    .eq("status", "draft")
    .maybeSingle();
  if (!ownedCourse) throw new Error("Only your draft courses can be edited.");
  let { data: module } = await client.from("course_modules").select("id").eq("course_id", courseId).order("position").limit(1).maybeSingle();
  if (!module) {
    const result = await client.from("course_modules").insert({ course_id: courseId, title: "Course lessons", position: 0 }).select("id").single();
    if (result.error) throw result.error;
    module = result.data;
  }
  const { count } = await client.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", module.id);
  const { error } = await client.from("lessons").insert({
    module_id: module.id,
    title: text(data, "title"),
    description: text(data, "description"),
    video_url: videoUrl,
    duration_seconds: Number(text(data, "duration_minutes") || 0) * 60,
    position: count || 0,
    is_free_preview: false,
  });
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}
export async function updateModule(data: FormData) {
  const { client } = await context("creator");
  const { error } = await client
    .from("course_modules")
    .update({ title: text(data, "title") })
    .eq("id", text(data, "id"));
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}
export async function deleteModule(data: FormData) {
  const { client } = await context("creator");
  const { error } = await client
    .from("course_modules")
    .delete()
    .eq("id", text(data, "id"));
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}
export async function updateLesson(data: FormData) {
  const { client } = await context("creator");
  const videoUrl = text(data, "video_url");
  if (videoUrl && !youtubeVideoId(videoUrl)) throw new Error("Enter a valid YouTube video link.");
  const { error } = await client
    .from("lessons")
    .update({
      title: text(data, "title"),
      description: text(data, "description"),
      video_url: videoUrl || null,
      duration_seconds: Number(text(data, "duration_minutes") || 0) * 60,
      is_free_preview: data.get("is_free_preview") === "on",
    })
    .eq("id", text(data, "id"));
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}
export async function deleteLesson(data: FormData) {
  const { client } = await context("creator");
  const { error } = await client
    .from("lessons")
    .delete()
    .eq("id", text(data, "id"));
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}
export async function updateProfile(data: FormData) {
  const { client, user } = await context();
  const { error } = await client
    .from("profiles")
    .update({
      full_name: text(data, "full_name"),
      username: text(data, "username") || null,
      bio: text(data, "bio") || null,
      country_code: text(data, "country_code").toUpperCase() || null,
    })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/dashboard/learner/profile");
}
export async function markLessonComplete(data: FormData) {
  const { client, user } = await context("learner");
  const enrollmentId = text(data, "enrollment_id"),
    lessonId = text(data, "lesson_id");
  const { data: enrollment } = await client
    .from("enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("learner_id", user.id)
    .single();
  if (!enrollment) throw new Error("Enrollment required");
  const { error } = await client
    .from("lesson_progress")
    .upsert(
      {
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "enrollment_id,lesson_id" },
    );
  if (error) throw error;
  revalidatePath("/dashboard/learner/my-learning");
}
export async function moderateCourse(data: FormData) {
  const { client } = await context("admin");
  const status = text(data, "status");
  if (!["published", "rejected", "archived"].includes(status))
    throw new Error("Invalid status");
  const { error } = await client
    .from("courses")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      rejection_reason:
        status === "rejected"
          ? text(data, "reason") || "Changes required"
          : null,
    })
    .eq("id", text(data, "id"));
  if (error) throw error;
  revalidatePath("/dashboard/admin/courses");
}
export type AdminCourseUpdateState = { ok: boolean; message: string };
export async function adminUpdateCourse(
  _previous: AdminCourseUpdateState,
  data: FormData,
): Promise<AdminCourseUpdateState> {
  try {
    const { client } = await context("admin");
    const id = text(data, "id");
    const title = text(data, "title");
    const price = Number(text(data, "price"));
    if (!id || !title) throw new Error("Course and title are required");
    if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid course price");
    const { data: updated, error } = await client.from("courses").update({
      title,
      category_id: text(data, "category_id") || null,
      price_minor: Math.round(price * 100),
      is_featured: data.get("is_featured") === "on",
    }).eq("id", id).select("id,is_featured").maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Course details were not updated");
    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/courses");
    revalidatePath("/");
    return { ok: true, message: updated.is_featured ? "Saved. This course is now featured." : "Course details saved." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Course details could not be saved." };
  }
}
export async function moderateCreator(data: FormData) {
  const { client } = await context("admin");
  const verification_status = text(data, "status");
  if (!["verified", "rejected"].includes(verification_status))
    throw new Error("Invalid status");
  const { error } = await client
    .from("creator_profiles")
    .update({
      verification_status,
      verified_at:
        verification_status === "verified" ? new Date().toISOString() : null,
    })
    .eq("user_id", text(data, "id"));
  if (error) throw error;
  revalidatePath("/dashboard/admin/creators");
}
export async function moderateAffiliate(data: FormData) {
  const { client } = await context("admin");
  const status = text(data, "status");
  if (!["approved", "rejected", "suspended"].includes(status))
    throw new Error("Invalid status");
  const { error } = await client
    .from("affiliates")
    .update({ status })
    .eq("user_id", text(data, "id"));
  if (error) throw error;
  revalidatePath("/dashboard/admin/affiliates");
}
export async function applyAffiliate(data: FormData) {
  const { client, user } = await context();
  const code = slugify(text(data, "code")).slice(0, 24);
  if (code.length < 4)
    throw new Error("Affiliate code must be at least four characters");
  let parent_affiliate_id: null | string = null;
  const parent = text(data, "parent_code");
  if (parent) {
    const { data: record } = await client
      .from("affiliates")
      .select("user_id")
      .eq("code", parent)
      .eq("status", "approved")
      .maybeSingle();
    parent_affiliate_id = record?.user_id || null;
  }
  const { error } = await client
    .from("affiliates")
    .upsert(
      { user_id: user.id, code, status: "pending", parent_affiliate_id },
      { onConflict: "user_id" },
    );
  if (error) throw error;
  revalidatePath("/dashboard/creator/affiliates");
}
export async function saveReview(data: FormData) {
  const { client, user } = await context("learner");
  const rating = Number(text(data, "rating"));
  if (rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5");
  const { error } = await client
    .from("reviews")
    .upsert(
      {
        course_id: text(data, "course_id"),
        learner_id: user.id,
        rating,
        body: text(data, "body") || null,
      },
      { onConflict: "course_id,learner_id" },
    );
  if (error) throw error;
  revalidatePath("/dashboard/learner/my-learning");
}
export async function moderateFinance(data: FormData) {
  const { client } = await context("admin");
  const type = text(data, "type"),
    status = text(data, "status"),
    id = text(data, "id");
  if (
    type === "refund" &&
    !["approved", "rejected", "processed"].includes(status)
  )
    throw new Error("Invalid refund status");
  if (
    type === "payout" &&
    !["approved", "processing", "paid", "rejected"].includes(status)
  )
    throw new Error("Invalid payout status");
  const table = type === "refund" ? "refunds" : "payouts";
  if (type === "payout" && status === "processing") {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack is not configured");
    const { data: payout } = await client.from("payouts").select("id,user_id,amount_minor,currency,status,provider_transfer_id").eq("id", id).single();
    if (!payout || !["pending", "approved"].includes(payout.status) || payout.provider_transfer_id) throw new Error("This payout cannot be transferred");
    const { data: account } = await client.from("payout_accounts").select("provider_recipient_code").eq("user_id", payout.user_id).single();
    if (!account?.provider_recipient_code) throw new Error("The creator has no verified Paystack recipient");
    const transferResponse = await fetch("https://api.paystack.co/transfer", { method:"POST", headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"}, body:JSON.stringify({source:"balance",amount:payout.amount_minor,recipient:account.provider_recipient_code,reason:"Mahadum creator payout",currency:payout.currency,reference:`payout-${payout.id}`}) });
    const transfer = await transferResponse.json() as {status?:boolean;message?:string;data?:{transfer_code?:string;status?:string}};
    if (!transferResponse.ok || !transfer.status || !transfer.data?.transfer_code) throw new Error(transfer.message || "Paystack could not initiate this transfer");
    const { error } = await client.from("payouts").update({status:"processing",provider_transfer_id:transfer.data.transfer_code}).eq("id",id);
    if (error) throw error;
    revalidatePath("/dashboard/admin/finance");
    revalidatePath("/dashboard/creator/wallet");
    return;
  }
  const payload =
    type === "payout"
      ? {
          status,
          processed_at: ["paid", "rejected"].includes(status)
            ? new Date().toISOString()
            : null,
        }
      : { status };
  const { error } = await client.from(table).update(payload).eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard/admin/finance");
}
export async function approveAllPendingPayouts() {
  const { client } = await context("admin");
  const { error } = await client.from("payouts").update({ status: "approved", processed_at: null }).eq("status", "pending");
  if (error) throw error;
  revalidatePath("/dashboard/admin/finance");
  revalidatePath("/dashboard/creator/wallet");
}

export async function setUserSuspension(data: FormData) {
  const { client, user } = await context("admin");
  const targetId=text(data,"user_id"),suspended=text(data,"suspended")==="true";
  if(!targetId||targetId===user.id)throw new Error("You cannot suspend your own administrator account");
  const {error}=await client.from("profiles").update({is_suspended:suspended}).eq("id",targetId);
  if(error)throw error;
  revalidatePath("/dashboard/admin/users");
}

export async function updateUserRoles(data: FormData) {
  const { client } = await context("admin");
  const targetId=text(data,"user_id");
  if(!targetId)throw new Error("User is required");
  const selected=["learner","creator"].filter(role=>data.get(role)==="on");
  const {data:existing,error:readError}=await client.from("user_roles").select("role").eq("user_id",targetId);
  if(readError)throw readError;
  const current=new Set((existing||[]).map(row=>row.role));
  const additions=selected.filter(role=>!current.has(role)).map(role=>({user_id:targetId,role}));
  if(additions.length){const {error}=await client.from("user_roles").insert(additions);if(error)throw error;}
  const removals=["learner","creator"].filter(role=>current.has(role)&&!selected.includes(role));
  if(removals.length){const {error}=await client.from("user_roles").delete().eq("user_id",targetId).in("role",removals);if(error)throw error;}
  revalidatePath("/dashboard/admin/users");
}

export async function saveCategory(data: FormData) {
  const { client } = await context("admin");
  const id = text(data, "id"),
    name = text(data, "name");
  const payload = {
    name,
    slug: slugify(name),
    description: text(data, "description"),
    sort_order: Number(text(data, "sort_order") || 0),
    is_active: data.get("is_active") === "on",
  };
  const query = id
    ? client.from("categories").update(payload).eq("id", id)
    : client.from("categories").insert(payload);
  const { error } = await query;
  if (error) throw error;
  revalidatePath("/dashboard/admin/settings");
}
export async function savePublicSetting(data: FormData) {
  const { client, user } = await context("admin");
  const key = `public.${slugify(text(data, "key")).replaceAll("-", ".")}`;
  const { error } = await client
    .from("platform_settings")
    .upsert(
      {
        key,
        value: { value: text(data, "value") },
        is_public: true,
        updated_by: user.id,
      },
      { onConflict: "key" },
    );
  if (error) throw error;
  revalidatePath("/dashboard/admin/settings");
}
export async function updateCourseThumbnail(data: FormData) {
  const { client, user } = await context("creator");
  const path = text(data, "path");
  if (!path.startsWith(`public/${user.id}/`)) throw new Error("Invalid thumbnail path.");
  const { data: updated, error } = await client
    .from("courses")
    .update({ thumbnail_path: path })
    .eq("id", text(data, "course_id"))
    .eq("creator_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) throw new Error("Course thumbnail could not be updated.");
  revalidatePath("/dashboard/creator/course-builder");
  revalidatePath("/courses");
}

export type WalletActionState = { error?: string; success?: string };

export async function requestWalletPayout(_previous: WalletActionState, data: FormData): Promise<WalletActionState> {
  const { client } = await context("creator");
  const amount = Number(text(data, "amount"));
  if (!Number.isFinite(amount) || amount < 10000)
    return { error: "The minimum payout is NGN 10,000." };
  const { error } = await client.rpc("request_payout", { p_amount_minor: Math.round(amount * 100) });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/creator/wallet");
  return { success: "Payout request submitted for review." };
}

export async function configurePayoutAccount(_previous: WalletActionState, data: FormData): Promise<WalletActionState> {
  const { client, user } = await context("creator");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { error: "Paystack is not configured." };
  const bankCode = text(data, "bank_code");
  const accountNumber = text(data, "account_number").replace(/\s/g, "");
  if (!/^\d{10}$/.test(accountNumber) || !bankCode) return { error: "Choose a bank and enter a valid 10-digit account number." };
  const resolveResponse = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, { headers:{Authorization:`Bearer ${secret}`}, cache:"no-store" });
  const resolved = await resolveResponse.json() as {status?:boolean;message?:string;data?:{account_name?:string}};
  if (!resolveResponse.ok || !resolved.status || !resolved.data?.account_name) return { error: resolved.message || "Paystack could not verify this bank account." };
  const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", { method:"POST", headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"}, body:JSON.stringify({type:"nuban",name:resolved.data.account_name,account_number:accountNumber,bank_code:bankCode,currency:"NGN"}) });
  const recipient = await recipientResponse.json() as {status?:boolean;message?:string;data?:{recipient_code?:string}};
  if (!recipientResponse.ok || !recipient.status || !recipient.data?.recipient_code) return { error: recipient.message || "Paystack could not create the payout recipient." };
  const { error } = await client.from("payout_accounts").upsert({user_id:user.id,provider:"paystack",account_name:resolved.data.account_name,bank_code:bankCode,account_number_last4:accountNumber.slice(-4),provider_recipient_code:recipient.data.recipient_code},{onConflict:"user_id"});
  if (error) return { error: "The verified payout account could not be saved." };
  revalidatePath("/dashboard/creator/wallet");
  return { success: `Bank account verified for ${resolved.data.account_name}.` };
}
