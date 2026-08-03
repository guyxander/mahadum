import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/checkout-button";
import { PublicHeader } from "@/components/public-header";

const HASHTAG = /(?:^|\s)#[\p{L}\p{N}_-]+/gu;

function formatOverview(description: string) {
  const clean = description.replace(HASHTAG, "").replace(/\s+/g, " ").trim();
  const [introduction, learningText = ""] = clean.split(/you will learn how to:/i);
  const outcomes = learningText
    .split("•")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  return { introduction: introduction.trim(), outcomes };
}

export default async function CoursePage({ params,searchParams }: { params: Promise<{ slug: string }>;searchParams:Promise<{ref?:string}> }) {
  const { slug } = await params;
  const query=await searchParams;
  const affiliateCode=/^[a-z0-9-]{4,24}$/.test(query.ref||"")?query.ref:undefined;
  const client = await createClient();
  if (!client) notFound();

  const coursePromise = client
    .from("courses")
    .select("id,creator_id,title,short_description,description,learning_outcomes,thumbnail_path,price_minor,currency,trailer_url,categories(name),profiles!courses_creator_id_fkey(full_name,bio),course_modules(id,title,position,lessons(id,title,duration_seconds,is_free_preview,position))")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  const userPromise = client.auth.getUser();
  const [{ data: course }, { data: { user } }] = await Promise.all([coursePromise, userPromise]);
  if (!course) notFound();

  const creator = course.profiles as unknown as { full_name: string; bio: string | null } | null;
  const category = course.categories as unknown as { name: string } | null;
  const modules = [...(course.course_modules || [])].sort((a, b) => a.position - b.position);
  const lessons = modules.flatMap((module) => [...(module.lessons || [])].sort((a, b) => a.position - b.position));
  const totalMinutes = Math.ceil(lessons.reduce((total, lesson) => total + (lesson.duration_seconds || 0), 0) / 60);
  const price = new Intl.NumberFormat("en-NG", { style: "currency", currency: course.currency, maximumFractionDigits: 0 }).format(course.price_minor / 100);
  const isCreator = user?.id === course.creator_id;
  const enrollment = user && !isCreator ? await client.from("enrollments").select("id").eq("learner_id", user.id).eq("course_id", course.id).maybeSingle() : null;
  const isEnrolled = Boolean(enrollment?.data);
  const firstLesson = lessons[0];
  const formatted = formatOverview(course.description);
  const introduction = formatted.introduction;
  const outcomes: string[] = Array.isArray(course.learning_outcomes) && course.learning_outcomes.length ? course.learning_outcomes.map(String) : formatted.outcomes;
  const creatorInitials = (creator?.full_name || "Mahadum creator").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const thumbnailUrl = course.thumbnail_path?.startsWith("public/") ? client.storage.from("course-thumbnails").getPublicUrl(course.thumbnail_path).data.publicUrl : "";

  return (
    <main className="catalogue-page course-sales-page">
      <PublicHeader courseBack />
      <section className="course-hero">
        <div className="course-hero-copy">
          <span className="overline">{category?.name || "Mahadum course"}</span>
          <h1>{course.title.replace(/\s*-\s*/g, " – ")}</h1>
          <p>{course.short_description}</p>
          <div className="course-byline"><span>{creatorInitials}</span><div><small>Created by</small><strong>{creator?.full_name || "Mahadum creator"}</strong></div></div>
          <div className="course-facts" aria-label="Course information">
            <div><strong>{lessons.length}</strong><span>{lessons.length === 1 ? "Video lesson" : "Video lessons"}</span></div>
            <div><strong>{totalMinutes || 0} min</strong><span>Total duration</span></div>
            <div><strong>Beginner</strong><span>Skill level</span></div>
            <div><strong>English</strong><span>Language</span></div>
          </div>
        </div>
        <aside className="course-checkout-card">
          {thumbnailUrl ? <img className="course-thumbnail" src={thumbnailUrl} alt={`${course.title} course thumbnail`} /> : <div className="course-preview-art" aria-label="Course video preview illustration"><span>AI</span><div><i /><i /><i /></div><b>▶</b></div>}
          <div className="checkout-body">
            <small>Complete course</small><strong className="course-price">{price}</strong>
            {isCreator ? <Link className="button" href={`/dashboard/creator/course-builder?course=${course.id}&step=details`}>Manage this course</Link> : isEnrolled && firstLesson ? <Link className="button" href={`/learn/${course.id}/${firstLesson.id}`}>Continue learning</Link> : user ? <CheckoutButton courseId={course.id} affiliateCode={affiliateCode} /> : <Link className="button" href={`/login?next=${encodeURIComponent(`/courses/${slug}${affiliateCode?`?ref=${affiliateCode}`:""}`)}`}>Log in to enroll</Link>}
            <ul><li>Full lifetime access</li><li>{lessons.length} on-demand video {lessons.length === 1 ? "lesson" : "lessons"}</li><li>Certificate upon completion</li><li>Learn on mobile or desktop</li></ul>
          </div>
        </aside>
      </section>

      <section className="course-body">
        <div className="course-main-content">
          <section className="course-section-card">
            <span className="overline">Course overview</span><h2>About this course</h2>
            <p>{introduction || course.short_description}</p>
          </section>
          {outcomes.length > 0 ? <section className="course-section-card"><span className="overline">Learning outcomes</span><h2>What you will learn</h2><ul className="outcomes-grid">{outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul></section> : null}
          <section className="course-section-card">
            <div className="curriculum-heading"><div><span className="overline">Curriculum</span><h2>Course content</h2></div><span>{modules.length} {modules.length === 1 ? "module" : "modules"} · {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}</span></div>
            {modules.length === 0 ? <div className="empty-state"><p>The creator is finalising the curriculum.</p></div> : modules.map((module, moduleIndex) => <section className="curriculum-card" key={module.id}><header><span>Module {moduleIndex + 1}</span><h3>{module.title}</h3></header>{[...(module.lessons || [])].sort((a, b) => a.position - b.position).map((lesson, index) => <div className="curriculum-lesson" key={lesson.id}><span>{index + 1}</span><div><b>{lesson.title}</b><small>{Math.ceil((lesson.duration_seconds || 0) / 60)} min</small></div>{lesson.is_free_preview ? <Link href={`/learn/${course.id}/${lesson.id}`}>Preview</Link> : <em aria-label="Enrollment required">Locked</em>}</div>)}</section>)}
          </section>
          <section className="course-section-card creator-profile-card"><div className="creator-large-avatar">{creatorInitials}</div><div><span className="overline">Your instructor</span><h2>{creator?.full_name || "Mahadum creator"}</h2><p>{creator?.bio || "An experienced practitioner sharing practical, project-based knowledge on Mahadum."}</p></div></section>
        </div>
      </section>
    </main>
  );
}
