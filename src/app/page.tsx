import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/public-header";
import { createClient } from "@/lib/supabase/server";

const categories = [
  {
    icon: "✦",
    name: "Design & Creativity",
    count: "240 courses",
    tone: "lavender",
  },
  { icon: "↗", name: "Business & Growth", count: "186 courses", tone: "blue" },
  { icon: "⌘", name: "Technology", count: "312 courses", tone: "mint" },
  { icon: "◎", name: "Media & Content", count: "154 courses", tone: "peach" },
];

const fallbackCourses = [
  {
    category: "Design",
    title: "Brand Identity Systems That Last",
    creator: "Amara Okafor",
    rating: "4.9",
    students: "1.8k",
    price: "₦18,500",
    color: "course-purple",
    initials: "AO",
    href: "/courses",
    thumbnail: "",
    featured: false,
  },
  {
    category: "Business",
    title: "Build a Profitable Digital Product",
    creator: "Tobi Adeyemi",
    rating: "4.8",
    students: "2.4k",
    price: "₦22,000",
    color: "course-orange",
    initials: "TA",
    href: "/courses",
    thumbnail: "",
    featured: false,
  },
  {
    category: "Content",
    title: "Storytelling for the Modern Creator",
    creator: "Zainab Musa",
    rating: "4.9",
    students: "980",
    price: "₦15,000",
    color: "course-blue",
    initials: "ZM",
    href: "/courses",
    thumbnail: "",
    featured: false,
  },
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default async function Home() {
  const client = await createClient();
  const result = client
    ? await client.from("courses").select("id,title,slug,thumbnail_path,price_minor,currency,is_featured,categories(name),profiles!courses_creator_id_fkey(full_name)").eq("status", "published").order("is_featured", { ascending: false }).order("published_at", { ascending: false }).limit(3)
    : { data: null };
  const liveCourses = (result.data || []).map((course, index) => {
    const profile = course.profiles as unknown as { full_name?: string } | null;
    const category = course.categories as unknown as { name?: string } | null;
    const creator = profile?.full_name || "Mahadum creator";
    const thumbnail = course.thumbnail_path?.startsWith("public/") && client
      ? client.storage.from("course-thumbnails").getPublicUrl(course.thumbnail_path).data.publicUrl
      : "";
    return {
      category: category?.name || "Course",
      title: course.title,
      creator,
      rating: "",
      students: "",
      price: new Intl.NumberFormat("en-NG", { style: "currency", currency: course.currency || "NGN", maximumFractionDigits: 0 }).format((course.price_minor || 0) / 100),
      color: ["course-purple", "course-orange", "course-blue"][index % 3],
      initials: creator.slice(0, 2).toUpperCase(),
      href: `/courses/${course.slug}`,
      thumbnail,
      featured: Boolean(course.is_featured),
    };
  });
  const courses = liveCourses.length ? liveCourses : fallbackCourses;
  return (
    <main>
      <PublicHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>●</span> Built for African creators
          </div>
          <h1>
            Learn from people
            <br />
            who <em>do the work.</em>
          </h1>
          <p>
            Practical courses from Africa&apos;s most ambitious creators. Build
            skills, earn certificates, and turn what you know into what&apos;s
            next.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/courses">
              Explore courses <span>→</span>
            </Link>
            <Link className="text-link" href="/creator">
              Start teaching <ArrowIcon />
            </Link>
          </div>
          <div className="trust-row">
            <div className="avatars">
              <span>AO</span>
              <span>TA</span>
              <span>ZM</span>
              <span>+2k</span>
            </div>
            <p>
              <strong>4.9 out of 5</strong>
              <br />
              from 12,000+ learners
            </p>
          </div>
        </div>
        <div className="hero-art" aria-label="Featured learning experience">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="lesson-card">
            <div className="lesson-visual">
              <span className="play">▶</span>
              <div className="lesson-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="lesson-body">
              <span className="mini-label">MASTERCLASS</span>
              <h3>Build your creative confidence</h3>
              <div className="progress">
                <span />
              </div>
              <small>Lesson 8 of 12</small>
            </div>
          </div>
          <div className="floating-card earning">
            <span>Creator earnings</span>
            <strong>₦842,500</strong>
            <small>↑ 18.4% this month</small>
          </div>
          <div className="floating-card certificate">
            <b>✓</b>
            <span>
              <strong>Certificate earned</strong>
              <small>Product Design</small>
            </span>
          </div>
        </div>
      </section>

      <section className="logo-strip">
        <p>Trusted by learners building at</p>
        <div>
          <span>paystack</span>
          <span>kuda</span>
          <span>moniepoint</span>
          <span>piggyvest</span>
          <span>techcabal</span>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="section-heading">
          <div>
            <span className="overline">Find your next skill</span>
            <h2>Explore by category</h2>
          </div>
          <Link href="/courses#categories">View all categories →</Link>
        </div>
        <div className="category-grid">
          {categories.map((item) => (
            <Link
              className={`category-card ${item.tone}`}
              href={`/courses?category=${encodeURIComponent(item.name)}`}
              key={item.name}
            >
              <span className="category-icon">{item.icon}</span>
              <div>
                <h3>{item.name}</h3>
                <p>{item.count}</p>
              </div>
              <span className="card-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section courses-section" id="courses">
        <div className="section-heading">
          <div>
            <span className="overline">Learn from the best</span>
            <h2>Courses learners love</h2>
          </div>
          <Link href="/courses">Browse all courses →</Link>
        </div>
        <div className="course-grid">
          {courses.map((course) => (
            <Link className="course-card" href={course.href} key={course.title}>
              <div className={`course-cover ${course.color}`}>
                {course.thumbnail ? <Image className="marketplace-thumbnail" src={course.thumbnail} alt={`${course.title} thumbnail`} width={640} height={360} unoptimized /> : null}
                <span>{course.category}</span>
                {!course.thumbnail ? <div className="cover-shape">
                  <i />
                  <i />
                  <i />
                </div> : null}
              </div>
              <div className="course-content">
                {course.featured ? <span className="featured-course-label">Featured course</span> : <div className="rating">
                  ★ {course.rating} <span>({course.students} learners)</span>
                </div>}
                <h3>{course.title}</h3>
                <div className="creator-row">
                  <span>{course.initials}</span>
                  <p>By {course.creator}</p>
                </div>
                <div className="course-footer">
                  <strong>{course.price}</strong>
                  <span>View course →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="creator-banner" id="creators">
        <div>
          <span className="overline light">Made for creators</span>
          <h2>
            Your knowledge can
            <br />
            change someone&apos;s life.
          </h2>
          <p>
            Build your course, grow your audience, and earn on your terms.
            Mahadum gives you the tools—and gets out of your way.
          </p>
          <Link className="button button-light" href="/creator">
            Become a creator →
          </Link>
        </div>
        <div className="creator-stats">
          <div>
            <strong>₦120m+</strong>
            <span>paid to creators</span>
          </div>
          <div>
            <strong>70%</strong>
            <span>creator revenue share</span>
          </div>
          <div>
            <strong>42</strong>
            <span>countries reached</span>
          </div>
        </div>
      </section>

      <footer>
        <Link className="brand" href="/">
          <span className="brand-mark">M</span> Mahadum
        </Link>
        <p>Learn. Create. Grow.</p>
        <div>
          <Link href="/courses">Explore</Link>
          <Link href="/creator">Teach</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/support">Help</Link>
        </div>
        <small>© 2026 Mahadum. Built for ambitious minds.</small>
      </footer>
    </main>
  );
}
