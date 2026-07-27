import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/checkout-button";
import { PublicHeader } from "@/components/public-header";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await createClient();
  if (!client) notFound();
  const { data: course } = await client
    .from("courses")
    .select(
      "id,title,short_description,description,price_minor,currency,trailer_url,categories(name),profiles!courses_creator_id_fkey(full_name,bio),course_modules(id,title,position,lessons(id,title,duration_seconds,is_free_preview))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!course) notFound();
  const {
    data: { user },
  } = await client.auth.getUser();
  const creator = course.profiles as unknown as {
    full_name: string;
    bio: string | null;
  } | null;
  const category = course.categories as unknown as { name: string } | null;
  const modules = (course.course_modules || []).sort(
    (a, b) => a.position - b.position,
  );
  const price = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: course.currency,
    maximumFractionDigits: 0,
  }).format(course.price_minor / 100);
  return (
    <main className="catalogue-page">
      <PublicHeader courseBack />
      <header className="legacy-site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span> Mahadum
        </Link>
        <nav className="desktop-nav">
          <Link href="/courses">← All courses</Link>
        </nav>
        <div className="header-actions">
          <Link className="login" href="/login">
            Log in
          </Link>
          <Link className="button button-small" href="/signup">
            Get started
          </Link>
        </div>
      </header>
      <section className="course-detail">
        <div>
          <span className="overline">{category?.name || "Mahadum course"}</span>
          <h1>{course.title}</h1>
          <p className="legal-summary">{course.short_description}</p>
          <p>
            Created by <b>{creator?.full_name || "Mahadum creator"}</b>
          </p>
          <div className="course-purchase">
            <strong>{price}</strong>
            {user ? (
              <CheckoutButton courseId={course.id} />
            ) : (
              <Link className="button" href="/login">
                Log in to enroll
              </Link>
            )}
          </div>
        </div>
        <aside className="panel">
          <h3>About this course</h3>
          <p>{course.description}</p>
          {creator?.bio && (
            <p>
              <b>About the creator:</b> {creator.bio}
            </p>
          )}
        </aside>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="overline">Curriculum</span>
            <h2>What you will learn</h2>
          </div>
        </div>
        {modules.length === 0 ? (
          <div className="empty-state">
            <p>The creator is finalising the curriculum.</p>
          </div>
        ) : (
          modules.map((module) => (
            <section className="panel curriculum-module" key={module.id}>
              <h3>{module.title}</h3>
              {(module.lessons || []).map((lesson, index) => (
                <div className="lesson-row" key={lesson.id}>
                  <span>{index + 1}</span>
                  <div>
                    <b>{lesson.title}</b>
                    <small>
                      {Math.ceil((lesson.duration_seconds || 0) / 60)} min
                      {lesson.is_free_preview ? " · Free preview" : ""}
                    </small>
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </section>
    </main>
  );
}
