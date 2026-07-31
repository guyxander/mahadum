import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";

type Category = { id: string; name: string; slug: string };
type Course = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  price_minor: number;
  currency: string;
  is_featured: boolean;
  thumbnail_path: string | null;
  categories: { name: string } | null;
  profiles: { full_name: string } | null;
};
const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const filters = await searchParams;
  const client = await createClient();
  let categories: Category[] = [];
  let courses: Course[] = [];
  if (client) {
    const categoryResult = await client
      .from("categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .order("sort_order");
    categories = (categoryResult.data || []) as Category[];
    let query = client
      .from("courses")
      .select(
        "id,title,slug,short_description,thumbnail_path,price_minor,currency,is_featured,categories(name),profiles!courses_creator_id_fkey(full_name)",
      )
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false });
    const selected = categories.find(
      (x) => x.name === filters.category || x.slug === filters.category,
    );
    if (selected) query = query.eq("category_id", selected.id);
    if (filters.q) query = query.ilike("title", `%${filters.q.slice(0, 80)}%`);
    const result = await query;
    courses = (result.data || []) as unknown as Course[];
  }
  return (
    <main className="catalogue-page">
      <PublicHeader />
      <section className="catalogue-hero">
        <span className="overline">Mahadum marketplace</span>
        <h1>Find your next practical skill.</h1>
        <form action="/courses">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search published courses"
          />
          <button className="button">Search</button>
        </form>
      </section>
      <section className="section" id="categories">
        <div className="catalogue-filters">
          <Link className={!filters.category ? "active" : ""} href="/courses">
            All
          </Link>
          {categories.map((item) => (
            <Link
              className={
                filters.category === item.name || filters.category === item.slug
                  ? "active"
                  : ""
              }
              href={`/courses?category=${encodeURIComponent(item.slug)}`}
              key={item.id}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="course-grid">
          {courses.length === 0 ? (
            <div className="empty-state">
              <b>No published courses yet</b>
              <p>
                {filters.q || filters.category
                  ? "Try another search or category."
                  : "Creators are preparing the first Mahadum courses."}
              </p>
            </div>
          ) : (
            courses.map((course, index) => {
              const thumbnailUrl = course.thumbnail_path?.startsWith("public/") ? client?.storage.from("course-thumbnails").getPublicUrl(course.thumbnail_path).data.publicUrl : "";
              return (
              <Link
                className="course-card"
                href={`/courses/${course.slug}`}
                key={course.id}
              >
                <div
                  className={`course-cover ${["course-purple", "course-orange", "course-blue"][index % 3]}`}
                >
                  {thumbnailUrl ? <Image className="marketplace-thumbnail" src={thumbnailUrl} alt={`${course.title} thumbnail`} width={640} height={360} unoptimized /> : null}
                  <span>{course.categories?.name || "Course"}</span>
                  {!thumbnailUrl ? <div className="cover-shape">
                    <i />
                    <i />
                    <i />
                  </div> : null}
                </div>
                <div className="course-content">
                  {course.is_featured ? <span className="featured-course-label">Featured course</span> : null}
                  <h3>{course.title}</h3>
                  <p>{course.short_description}</p>
                  <div className="creator-row">
                    <span>
                      {(course.profiles?.full_name || "M")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <p>By {course.profiles?.full_name || "Mahadum creator"}</p>
                  </div>
                  <div className="course-footer">
                    <strong>
                      {money(course.price_minor, course.currency)}
                    </strong>
                    <span>View course →</span>
                  </div>
                </div>
              </Link>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
