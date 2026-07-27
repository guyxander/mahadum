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
  const payload = {
    creator_id: user.id,
    category_id: text(data, "category_id") || null,
    title,
    slug: `${slugify(title)}-${user.id.slice(0, 8)}`,
    short_description: text(data, "short_description"),
    description: text(data, "description"),
    price_minor: Math.round(Number(text(data, "price")) * 100),
    currency: "NGN",
  };
  if (
    !title ||
    !payload.short_description ||
    !payload.description ||
    !Number.isFinite(payload.price_minor) ||
    payload.price_minor < 0
  )
    throw new Error("Complete all course fields");
  const query = id
    ? client.from("courses").update(payload).eq("id", id)
    : client.from("courses").insert(payload);
  const { error } = await query;
  if (error) throw error;
  revalidatePath("/dashboard/creator/courses");
  redirect("/dashboard/creator/courses");
}
export async function submitCourse(data: FormData) {
  const { client } = await context("creator");
  const { error } = await client
    .from("courses")
    .update({ status: "in_review" })
    .eq("id", text(data, "id"))
    .eq("status", "draft");
  if (error) throw error;
  revalidatePath("/dashboard/creator/courses");
}
export async function deleteCourse(data: FormData) {
  const { client } = await context("creator");
  const { error } = await client
    .from("courses")
    .delete()
    .eq("id", text(data, "id"))
    .eq("status", "draft");
  if (error) throw error;
  revalidatePath("/dashboard/creator/courses");
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
  const { client } = await context("creator");
  const { error } = await client
    .from("courses")
    .update({ thumbnail_path: text(data, "path") })
    .eq("id", text(data, "course_id"));
  if (error) throw error;
  revalidatePath("/dashboard/creator/course-builder");
}
