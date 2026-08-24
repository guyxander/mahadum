import Link from "next/link";
import type { DashboardData, Row } from "@/lib/dashboard";
import {
  addLesson,
  addFirstLesson,
  addModule,
  approveAllPendingPayouts,
  deleteCourse,
  deleteLesson,
  deleteModule,
  moderateAffiliate,
  moderateCreator,
  moderateFinance,
  saveCategory,
  saveCourse,
  savePlatformSetting,
  saveReview,
  submitCourse,
  updateLesson,
  updateModule,
  updateAffiliateCommissions,
  updateProfile,
} from "@/app/dashboard/actions";
import { CheckoutButton } from "@/components/checkout-button";
import { AssetUploader } from "@/components/asset-uploader";
import { youtubeVideoId } from "@/lib/youtube";
import { CourseBuilderWizard } from "@/components/course-builder-wizard";
import { DeleteCourseButton } from "@/components/delete-course-button";
import { BankAccountForm, PayoutRequestForm } from "@/components/wallet-forms";
import { AdminUsers } from "@/components/admin-users";
import { AdminCourses } from "@/components/admin-courses";
import { AdminAffiliates } from "@/components/admin-affiliates";
import { AffiliateCourseLinks } from "@/components/affiliate-course-links";

const string = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) => (typeof value === "number" ? value : 0);
const object = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
const list = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);
const courseThumbnail = (value: unknown) => {
  const path = string(value);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path.startsWith("public/")) return "";
  return `${base}/storage/v1/object/public/course-thumbnails/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
};
const money = (minor: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
const date = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
        new Date(String(value)),
      )
    : "—";

export function DashboardContent({
  role,
  section,
  data,
  builderCourseId,
  wizardStep,
}: {
  role: string;
  section: string;
  data: DashboardData;
  builderCourseId?: string;
  wizardStep?: string;
}) {
  if (role === "creator" && section === "course-builder")
    return (
      <CourseBuilderWizard
        data={data}
        courseId={builderCourseId}
        step={wizardStep}
      />
    );
  if (role === "creator" && section === "courses")
    return <CreatorCourses data={data} />;
  if (role === "creator" && section === "affiliates")
    return <AffiliatePanel data={data} />;
  if (role === "creator" && section === "transactions")
    return <CreatorTransactions data={data} />;
  if (role === "creator" && section === "payout-settings")
    return <PayoutPanel data={data} />;
  if (role === "creator" && section === "wallet")
    return <WalletPanel data={data} />;
  if (role === "learner" && section === "my-learning")
    return <MyLearning data={data} />;
  if (role === "learner" && section === "explore")
    return <Explore data={data} />;
  if (role === "learner" && section === "certificates")
    return <Certificates data={data} />;
  if (role === "learner" && section === "affiliates")
    return <AffiliatePanel data={data} />;
  if (section === "profile") return <Profile data={data} />;
  if (role === "admin") return <AdminSection section={section} data={data} />;
  return <Overview role={role} data={data} />;
}

export function LegacyCourseBuilder({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-page">
      <PageHead
        title="Course builder"
        subtitle="Create real courses, modules, lessons, and protected assets."
      />
      <section className="panel">
        <h3>New course</h3>
        <CourseForm categories={data.categories} />
      </section>
      {data.courses.map((course) => {
        const modules = list(course.course_modules);
        const hasYouTubeLesson = modules.some((module) =>
          list(module.lessons).some((lesson) =>
            Boolean(youtubeVideoId(string(lesson.video_url))),
          ),
        );
        return (
          <section className="panel course-editor" key={string(course.id)}>
            <div className="course-readiness">
              <strong>
                {hasYouTubeLesson
                  ? "Ready to publish"
                  : "Next: add your first YouTube lesson"}
              </strong>
              <span>
                {hasYouTubeLesson
                  ? "Your draft has a playable lecture video."
                  : "Paste a YouTube link below. Mahadum will embed it for learners."}
              </span>
              {string(course.status) === "draft" && hasYouTubeLesson ? (
                <form action={submitCourse}>
                  <input type="hidden" name="id" value={string(course.id)} />
                  <button className="button">Publish course</button>
                </form>
              ) : null}
            </div>
            <div className="panel-head">
              <div>
                <span className={`status ${string(course.status)}`}>
                  {string(course.status)}
                </span>
                <h3>{string(course.title)}</h3>
              </div>
            </div>
            <AssetUploader userId={data.userId} courseId={string(course.id)} />
            <details>
              <summary>Edit course details</summary>
              <CourseForm categories={data.categories} course={course} />
            </details>
            {list(course.course_modules).length === 0 ? (
              <form action={addFirstLesson} className="first-lesson-form">
                <input
                  type="hidden"
                  name="course_id"
                  value={string(course.id)}
                />
                <div>
                  <span className="overline">Step 2 of 2</span>
                  <h3>Add your first YouTube lesson</h3>
                  <p>
                    Use an Unlisted YouTube video. Learners watch it inside
                    Mahadum without seeing a direct video link.
                  </p>
                </div>
                <label>
                  Lesson title
                  <input name="title" required placeholder="Introduction" />
                </label>
                <label>
                  YouTube video link
                  <input
                    name="video_url"
                    type="url"
                    required
                    inputMode="url"
                    placeholder="https://youtu.be/..."
                  />
                </label>
                <label>
                  Duration (minutes)
                  <input
                    name="duration_minutes"
                    type="number"
                    min="0"
                    placeholder="10"
                  />
                </label>
                <label className="first-lesson-description">
                  Lesson description
                  <textarea
                    name="description"
                    placeholder="What learners will cover in this lesson"
                  />
                </label>
                <button className="button">Save YouTube lesson</button>
              </form>
            ) : null}
            <form action={addModule} className="inline-form">
              <input type="hidden" name="course_id" value={string(course.id)} />
              <input name="title" required placeholder="New module title" />
              <button className="outline-button">Add module</button>
            </form>
            {list(course.course_modules)
              .sort((a, b) => number(a.position) - number(b.position))
              .map((module) => (
                <div className="module-editor" key={string(module.id)}>
                  <form action={updateModule} className="inline-form">
                    <input type="hidden" name="id" value={string(module.id)} />
                    <input
                      name="title"
                      defaultValue={string(module.title)}
                      required
                    />
                    <button className="outline-button">Rename</button>
                  </form>
                  {list(module.lessons)
                    .sort((a, b) => number(a.position) - number(b.position))
                    .map((lesson) => (
                      <details className="lesson-row" key={string(lesson.id)}>
                        <summary>
                          {number(lesson.position) + 1}. {string(lesson.title)}{" "}
                          · {Math.ceil(number(lesson.duration_seconds) / 60)}{" "}
                          min
                        </summary>
                        <form
                          action={updateLesson}
                          className="crud-form compact"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={string(lesson.id)}
                          />
                          <input
                            name="title"
                            defaultValue={string(lesson.title)}
                            required
                          />
                          <label>
                            YouTube video link
                            <input
                              name="video_url"
                              type="url"
                              defaultValue={string(lesson.video_url)}
                              placeholder="https://youtu.be/..."
                            />
                          </label>
                          <input
                            name="duration_minutes"
                            type="number"
                            min="0"
                            defaultValue={Math.ceil(
                              number(lesson.duration_seconds) / 60,
                            )}
                          />
                          <textarea
                            name="description"
                            defaultValue={string(lesson.description)}
                          />
                          <label className="check">
                            <input
                              name="is_free_preview"
                              type="checkbox"
                              defaultChecked={Boolean(lesson.is_free_preview)}
                            />{" "}
                            Free preview
                          </label>
                          <button className="outline-button">
                            Update lesson
                          </button>
                        </form>
                        <form action={deleteLesson}>
                          <input
                            type="hidden"
                            name="id"
                            value={string(lesson.id)}
                          />
                          <button className="danger-button">
                            Delete lesson
                          </button>
                        </form>
                      </details>
                    ))}
                  <form action={addLesson} className="crud-form compact">
                    <input
                      type="hidden"
                      name="module_id"
                      value={string(module.id)}
                    />
                    <input name="title" required placeholder="Lesson title" />
                    <label>
                      YouTube video link
                      <input
                        name="video_url"
                        type="url"
                        placeholder="https://youtu.be/..."
                      />
                    </label>
                    <input
                      name="duration_minutes"
                      type="number"
                      min="0"
                      placeholder="Minutes"
                    />
                    <textarea
                      name="description"
                      placeholder="Lesson description"
                    />
                    <label className="check">
                      <input name="is_free_preview" type="checkbox" /> Free
                      preview
                    </label>
                    <button className="outline-button">Add lesson</button>
                  </form>
                  <form action={deleteModule}>
                    <input type="hidden" name="id" value={string(module.id)} />
                    <button className="danger-button">Delete module</button>
                  </form>
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}

function CourseForm({
  categories,
  course,
}: {
  categories: Row[];
  course?: Row;
}) {
  return (
    <form action={saveCourse} className="crud-form">
      <input type="hidden" name="id" value={string(course?.id)} />
      <label>
        Course title
        <input name="title" defaultValue={string(course?.title)} required />
      </label>
      <label>
        Short description
        <input
          name="short_description"
          defaultValue={string(course?.short_description)}
          required
          maxLength={180}
        />
      </label>
      <label>
        Full description
        <textarea
          name="description"
          defaultValue={string(course?.description)}
          required
        />
      </label>
      <div className="form-row">
        <label>
          Category
          <select
            name="category_id"
            defaultValue={string(course?.category_id)}
            required
          >
            <option value="">Select category</option>
            {categories.map((x) => (
              <option value={string(x.id)} key={string(x.id)}>
                {string(x.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Price (NGN)
          <input
            name="price"
            type="number"
            min="0"
            step="100"
            defaultValue={course ? number(course.price_minor) / 100 : undefined}
            required
          />
        </label>
      </div>
      {!course ? (
        <fieldset className="first-video-fields">
          <legend>First YouTube lesson</legend>
          <p>
            Paste an Unlisted YouTube link. The video will play inside Mahadum
            without displaying the direct link to ordinary learners.
          </p>
          <label>
            Lesson title
            <input name="lesson_title" required placeholder="Introduction" />
          </label>
          <label>
            YouTube video link
            <input
              name="video_url"
              type="url"
              inputMode="url"
              required
              placeholder="https://youtu.be/..."
            />
          </label>
          <label>
            Duration (minutes)
            <input
              name="duration_minutes"
              type="number"
              min="0"
              placeholder="10"
            />
          </label>
          <label>
            Lesson description
            <textarea
              name="lesson_description"
              placeholder="What learners will cover"
            />
          </label>
        </fieldset>
      ) : null}
      <button className="button">
        {course ? "Update course" : "Create course with video"}
      </button>
    </form>
  );
}

function CreatorCourses({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-page">
      <PageHead
        title="Courses"
        subtitle="Manage drafts and publish completed courses immediately."
        action="Create course"
        actionHref="/dashboard/creator/course-builder"
      />
      <section className="panel table-panel">
        {data.courses.length === 0 ? (
          <Empty text="No courses yet. Create your first draft." />
        ) : (
          data.courses.map((course) => (
            <div className="data-row" key={string(course.id)}>
              <span className="user-avatar">
                {string(course.title).slice(0, 2).toUpperCase()}
              </span>
              <div>
                <b>{string(course.title)}</b>
                <small>
                  {money(
                    number(course.price_minor),
                    string(course.currency) || "NGN",
                  )}{" "}
                  · {date(course.updated_at)}
                </small>
              </div>
              <span>
                {string(object(course.categories).name) || "Uncategorised"}
              </span>
              <span className={`status ${string(course.status)}`}>
                {string(course.status)}
              </span>
              <div className="row-actions">
                <Link
                  className="manage-course-link"
                  href={`/dashboard/creator/course-builder?course=${string(course.id)}&step=details`}
                >
                  Manage course
                </Link>
                {(course.status === "draft" ||
                  course.status === "rejected") && (
                  <>
                    <DeleteCourseButton
                      courseId={string(course.id)}
                      courseTitle={string(course.title)}
                      action={deleteCourse}
                    />
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function MyLearning({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-page">
      <PageHead
        title="My learning"
        subtitle="Continue courses purchased through your account."
        action="Explore"
        actionHref="/dashboard/learner/explore"
      />
      <div className="learning-grid">
        {data.enrollments.length === 0 ? (
          <Empty text="You are not enrolled in a course yet." />
        ) : (
          data.enrollments.map((enrollment) => {
            const course = object(enrollment.courses);
            const lessons = list(course.course_modules).flatMap((m) =>
              list(m.lessons),
            );
            const done = new Set(
              data.progress
                .filter(
                  (p) => p.enrollment_id === enrollment.id && p.completed_at,
                )
                .map((p) => p.lesson_id),
            );
            const percent = lessons.length
              ? Math.round((done.size / lessons.length) * 100)
              : 0;
            const next = lessons.find((x) => !done.has(x.id)) || lessons[0];
            const review = data.reviews.find((x) => x.course_id === course.id);
            return (
              <article className="learning-card" key={string(enrollment.id)}>
                <div className="learning-cover">
                  <span>{percent}%</span>
                </div>
                <div>
                  <small>
                    {enrollment.completed_at ? "COMPLETED" : "IN PROGRESS"}
                  </small>
                  <h3>{string(course.title)}</h3>
                  <p>{string(course.short_description)}</p>
                  <div className="progress">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  {next && (
                    <Link
                      href={`/learn/${string(course.id)}/${string(next.id)}`}
                    >
                      Continue learning →
                    </Link>
                  )}
                  <details>
                    <summary>
                      {review ? "Edit review" : "Rate this course"}
                    </summary>
                    <form action={saveReview} className="crud-form">
                      <input
                        type="hidden"
                        name="course_id"
                        value={string(course.id)}
                      />
                      <label>
                        Rating
                        <select
                          name="rating"
                          defaultValue={number(review?.rating) || 5}
                        >
                          {[5, 4, 3, 2, 1].map((x) => (
                            <option value={x} key={x}>
                              {x} stars
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Review
                        <textarea
                          name="body"
                          defaultValue={string(review?.body)}
                        />
                      </label>
                      <button className="outline-button">Save review</button>
                    </form>
                  </details>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function Explore({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-page">
      <PageHead
        title="Explore courses"
        subtitle="Published courses from verified Mahadum creators."
      />
      <div className="learning-grid">
        {data.courses.length === 0 ? (
          <Empty text="No courses have been published yet." />
        ) : (
          data.courses.map((course) => {
            const href = `/courses/${encodeURIComponent(string(course.slug))}`;
            const thumbnail = courseThumbnail(course.thumbnail_path);
            return <article className="learning-card explore-course-card" key={string(course.id)}>
              <Link
                className={`learning-cover explore-course-cover${thumbnail ? " has-thumbnail" : ""}`}
                href={href}
                aria-label={`View ${string(course.title)} course details`}
                style={thumbnail ? { backgroundImage: `linear-gradient(180deg,transparent 42%,rgba(26,9,45,.66)),url("${thumbnail}")` } : undefined}
              >
                <span>{string(object(course.categories).name) || "Course"}</span>
                <b>View course <span aria-hidden="true">→</span></b>
              </Link>
              <div>
                <Link className="explore-course-details" href={href}>
                  <small>{money(number(course.price_minor),string(course.currency) || "NGN")}</small>
                  <h3>{string(course.title)}</h3>
                  <p>{string(course.short_description)}</p>
                  <span className="explore-view-link">Course details <b aria-hidden="true">→</b></span>
                </Link>
                <CheckoutButton courseId={string(course.id)} variant="explore" />
              </div>
            </article>;
          })
        )}
      </div>
    </div>
  );
}

function Certificates({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-page">
      <PageHead
        title="Certificates"
        subtitle="Verifiable proof of completed learning."
      />
      {data.certificates.length === 0 ? (
        <Empty text="Certificates appear automatically after every lesson is completed." />
      ) : (
        data.certificates.map((item) => {
          const enrollment = object(item.enrollments);
          return (
            <div className="certificate-sheet" key={string(item.id)}>
              <span className="brand-mark">M</span>
              <small>CERTIFICATE OF COMPLETION</small>
              <h2>{string(object(enrollment.courses).title)}</h2>
              <p>This certifies that</p>
              <h3>{data.name}</h3>
              <p>
                successfully completed this course on{" "}
                {date(enrollment.completed_at)}.
              </p>
              <div>
                <b>Mahadum</b>
                <b>{string(item.verification_code).toUpperCase()}</b>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function Profile({ data }: { data: DashboardData }) {
  const profile = data.profile || {};
  return (
    <div className="dashboard-page">
      <PageHead
        title="Profile"
        subtitle="Keep your public and account information current."
      />
      <section className="panel">
        <form action={updateProfile} className="crud-form">
          <label>
            Full name
            <input
              name="full_name"
              defaultValue={string(profile.full_name)}
              required
            />
          </label>
          <label>
            Username
            <input name="username" defaultValue={string(profile.username)} />
          </label>
          <label>
            Bio
            <textarea name="bio" defaultValue={string(profile.bio)} />
          </label>
          <label>
            Country code
            <input
              name="country_code"
              defaultValue={string(profile.country_code)}
              maxLength={2}
            />
          </label>
          <label>
            WhatsApp number
            <input
              name="whatsapp_number"
              type="tel"
              inputMode="tel"
              defaultValue={string(data.creatorContact?.whatsapp_number)}
              placeholder="+2348012345678"
              aria-describedby="whatsapp-help"
            />
            <small id="whatsapp-help">
              Include your country code. Learners will use this to ask questions
              about your courses.
            </small>
          </label>
          <button className="button">Save profile</button>
        </form>
      </section>
    </div>
  );
}

function AffiliatePanel({ data }: { data: DashboardData }) {
  const affiliate = data.affiliates[0];
  const affiliateStatus = string(affiliate?.status);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://mahadum.xyz";
  return (
    <div className="dashboard-page">
      <PageHead
        title="Affiliates"
        subtitle="Share any published Mahadum course and earn from eligible referrals."
      />
      {affiliate ? (
        <>
          <section className="panel affiliate-account-card">
            <h3>Your affiliate account</h3>
            <div className="affiliate-account-summary">
              <div>
                <span>Referral code</span>
                <strong>{string(affiliate.code)}</strong>
              </div>
              <div>
                <span>Account status</span>
                <strong>
                  <span className={`status ${string(affiliate.status)}`}>
                    {string(affiliate.status)}
                  </span>
                </strong>
              </div>
            </div>
            <div className="affiliate-member-rates">
              <div>
                <span>Level one</span>
                <strong>{number(affiliate.level_one_bps) / 100}%</strong>
                <small>Direct course referrals</small>
              </div>
              <div>
                <span>Level two</span>
                <strong>{number(affiliate.level_two_bps) / 100}%</strong>
                <small>Affiliate network referrals</small>
              </div>
            </div>
          </section>
          {affiliateStatus === "approved" ? (
            <AffiliateCourseLinks
              code={string(affiliate.code)}
              siteUrl={siteUrl}
              courses={data.marketplaceCourses.map((course) => ({
                id: string(course.id),
                title: string(course.title),
                slug: string(course.slug),
                shortDescription: string(course.short_description),
                priceMinor: number(course.price_minor),
                currency: string(course.currency) || "NGN",
              }))}
            />
          ) : (
            <section className="panel">
              <h3>Affiliate links are awaiting approval</h3>
              <p className="muted-copy">
                Your course links will appear automatically after an
                administrator approves this affiliate account.
              </p>
            </section>
          )}
        </>
      ) : (
        <section className="panel">
          <h3>Preparing your affiliate links</h3>
          <p className="muted-copy">
            Your affiliate account is created automatically. Refresh this page
            in a moment if your links have not appeared yet.
          </p>
        </section>
      )}
    </div>
  );
}
function CreatorTransactions({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-page">
      <PageHead
        title="Transactions"
        subtitle="Creator earnings recorded in the immutable ledger."
      />
      <section className="panel table-panel">
        {data.ledger.length === 0 ? (
          <Empty text="No verified earnings have been recorded." />
        ) : (
          data.ledger.map((row) => (
            <div className="data-row" key={string(row.id)}>
              <span className="user-avatar">₦</span>
              <div>
                <b>{string(row.entry_type).replaceAll("_", " ")}</b>
                <small>{date(row.created_at)}</small>
              </div>
              <span>{string(row.currency)}</span>
              <strong>
                {money(number(row.amount_minor), string(row.currency) || "NGN")}
              </strong>
              <span />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
function PayoutPanel({ data }: { data: DashboardData }) {
  const balance =
    data.ledger.reduce((sum, row) => sum + number(row.amount_minor), 0) -
    data.payouts
      .filter((x) =>
        ["pending", "approved", "processing", "paid"].includes(
          string(x.status),
        ),
      )
      .reduce((sum, row) => sum + number(row.amount_minor), 0);
  return (
    <div className="dashboard-page">
      <PageHead
        title="Payout settings"
        subtitle="Payouts require a verified Paystack transfer recipient."
      />
      <div className="metric-grid">
        <article className="metric-card">
          <span>Available ledger balance</span>
          <strong>{money(balance)}</strong>
        </article>
        <article className="metric-card">
          <span>Minimum payout</span>
          <strong>₦10,000</strong>
        </article>
      </div>
      <section className="panel">
        <h3>Bank verification pending configuration</h3>
        <p>
          Bank details will be tokenised and verified through Paystack when
          payment credentials are configured. Mahadum will not store raw account
          numbers.
        </p>
      </section>
    </div>
  );
}

function WalletPanel({ data }: { data: DashboardData }) {
  const creator = data.ledger
    .filter((x) => string(x.entry_type) === "creator_earning")
    .reduce((s, x) => s + number(x.amount_minor), 0);
  const affiliateAmount = data.ledger
    .filter((x) => string(x.entry_type) === "affiliate_commission")
    .reduce((s, x) => s + number(x.amount_minor), 0);
  const total = data.ledger.reduce((s, x) => s + number(x.amount_minor), 0);
  const pending = 0;
  const reserved = data.payouts
    .filter((x) =>
      ["pending", "approved", "processing", "paid"].includes(string(x.status)),
    )
    .reduce((s, x) => s + number(x.amount_minor), 0);
  const available = Math.max(0, total - pending - reserved);
  const paid = data.payouts
    .filter((x) => string(x.status) === "paid")
    .reduce((s, x) => s + number(x.amount_minor), 0);
  const affiliate = data.affiliates[0];
  return (
    <div className="dashboard-page wallet-page">
      <PageHead
        title="Wallet"
        subtitle="Your creator earnings, affiliate commissions, and payouts in one place."
      />
      <section className="wallet-hero">
        <div>
          <span>Available balance</span>
          <strong>{money(available)}</strong>
          <small>Settled funds ready for withdrawal</small>
        </div>
        <div>
          <span>Next payout window</span>
          <b>Friday</b>
          <small>Minimum withdrawal: ₦10,000</small>
        </div>
      </section>
      <div className="metric-grid wallet-metrics">
        <article className="metric-card">
          <span>Pending settlement</span>
          <strong>{money(pending)}</strong>
          <small>Earnings are available immediately</small>
        </article>
        <article className="metric-card">
          <span>Creator earnings</span>
          <strong>{money(creator)}</strong>
          <small>70% share from course sales</small>
        </article>
        <article className="metric-card">
          <span>Affiliate earnings</span>
          <strong>{money(affiliateAmount)}</strong>
          <small>
            {affiliate
              ? `${number(affiliate.level_one_bps) / 100}% direct · ${number(affiliate.level_two_bps) / 100}% level two`
              : "Activate affiliates to earn"}
          </small>
        </article>
        <article className="metric-card">
          <span>Total paid out</span>
          <strong>{money(paid)}</strong>
          <small>Completed withdrawals</small>
        </article>
      </div>
      <div className="wallet-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Wallet activity</h3>
              <p>Every earning is recorded in your secure ledger.</p>
            </div>
          </div>
          {data.ledger.length === 0 ? (
            <Empty text="Your earnings will appear here after a verified course sale or affiliate conversion." />
          ) : (
            <div className="wallet-list">
              {data.ledger.map((row) => {
                const payment = object(row.payments);
                const course = object(payment.courses);
                const isAffiliate =
                  string(row.entry_type) === "affiliate_commission";
                return (
                  <div className="wallet-row" key={string(row.id)}>
                    <span
                      className={
                        isAffiliate ? "affiliate-credit" : "creator-credit"
                      }
                    >
                      {isAffiliate ? "A" : "C"}
                    </span>
                    <div>
                      <b>
                        {isAffiliate
                          ? "Affiliate commission"
                          : "Course sale earning"}
                      </b>
                      <small>
                        {string(course.title) ||
                          string(payment.tx_ref) ||
                          "Mahadum transaction"}{" "}
                        · {date(row.created_at)}
                      </small>
                    </div>
                    <strong>
                      +
                      {money(
                        number(row.amount_minor),
                        string(row.currency) || "NGN",
                      )}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <aside className="wallet-side">
          <section className="panel">
            <h3>Withdraw funds</h3>
            {data.payoutAccount ? (
              <>
                <p>
                  Verified account: {string(data.payoutAccount.account_name)}{" "}
                  ····{string(data.payoutAccount.account_number_last4)}
                </p>
                <PayoutRequestForm available={available} />
                <details className="wallet-change-account">
                  <summary>Change payout account</summary>
                  <BankAccountForm banks={data.payoutBanks} />
                </details>
              </>
            ) : (
              <>
                <p>
                  Connect and verify the Nigerian bank account that should
                  receive your payouts.
                </p>
                <BankAccountForm banks={data.payoutBanks} />
              </>
            )}
          </section>
          <section className="panel">
            <h3>Payout history</h3>
            {data.payouts.length === 0 ? (
              <p className="muted-copy">No payout requests yet.</p>
            ) : (
              <div className="wallet-list compact">
                {data.payouts.map((row) => (
                  <div className="wallet-row" key={string(row.id)}>
                    <div>
                      <b>
                        {money(
                          number(row.amount_minor),
                          string(row.currency) || "NGN",
                        )}
                      </b>
                      <small>{date(row.requested_at)}</small>
                    </div>
                    <span className={`status ${string(row.status)}`}>
                      {string(row.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
          {affiliate ? (
            <section className="panel wallet-affiliate">
              <span className="overline">Affiliate wallet</span>
              <h3>{string(affiliate.code)}</h3>
              <p>
                {data.referrals.filter((x) => x.converted_at).length}{" "}
                conversions from {data.referrals.length} attributed referrals.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function FinanceAdmin({ data }: { data: DashboardData }) {
  const pendingPayouts = data.payouts.filter(
    (row) => string(row.status) === "pending",
  );
  const pendingPayoutTotal = pendingPayouts.reduce(
    (sum, row) => sum + number(row.amount_minor),
    0,
  );
  return (
    <div className="dashboard-page">
      <PageHead
        title="Finance"
        subtitle="Review verified payments, refund requests, and payout requests."
      />
      <section className="panel">
        <h3>Refund requests</h3>
        {data.refunds.length === 0 ? (
          <Empty text="No refund requests." />
        ) : (
          data.refunds.map((row) => (
            <FinanceRow row={row} type="refund" key={string(row.id)} />
          ))
        )}
      </section>
      <section className="panel">
        <div className="panel-head finance-payout-head">
          <div>
            <h3>Payout requests</h3>
            <p>
              {pendingPayouts.length} pending · {money(pendingPayoutTotal)}
            </p>
          </div>
          {pendingPayouts.length > 0 ? (
            <form action={approveAllPendingPayouts}>
              <button className="button">Approve all pending</button>
            </form>
          ) : null}
        </div>
        {data.payouts.length === 0 ? (
          <Empty text="No payout requests." />
        ) : (
          data.payouts.map((row) => (
            <FinanceRow row={row} type="payout" key={string(row.id)} />
          ))
        )}
      </section>
      <section className="panel">
        <h3>Payments</h3>
        {data.payments.length === 0 ? (
          <Empty text="No payment records." />
        ) : (
          data.payments.map((row) => (
            <div className="data-row" key={string(row.id)}>
              <span className="user-avatar">₦</span>
              <div>
                <b>{string(row.tx_ref)}</b>
                <small>{date(row.created_at)}</small>
              </div>
              <span>
                {money(number(row.amount_minor), string(row.currency) || "NGN")}
              </span>
              <span className={`status ${string(row.status)}`}>
                {string(row.status)}
              </span>
              <span />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
function FinanceRow({ row, type }: { row: Row; type: "refund" | "payout" }) {
  const options =
    type === "refund"
      ? ["approved", "rejected", "processed"]
      : ["approved", "processing", "paid", "rejected"];
  return (
    <div className="data-row">
      <span className="user-avatar">₦</span>
      <div>
        <b>{money(number(row.amount_minor), string(row.currency) || "NGN")}</b>
        <small>
          {string(row.reason) || date(row.created_at || row.requested_at)}
        </small>
      </div>
      <span>{type}</span>
      <span className={`status ${string(row.status)}`}>
        {string(row.status)}
      </span>
      <div className="finance-row-actions">
        {type === "payout" && string(row.status) === "pending" ? (
          <form action={moderateFinance}>
            <input type="hidden" name="id" value={string(row.id)} />
            <input type="hidden" name="type" value="payout" />
            <input type="hidden" name="status" value="approved" />
            <button className="approve-payout-button">Approve</button>
          </form>
        ) : null}
        <form action={moderateFinance} className="row-actions">
          <input type="hidden" name="id" value={string(row.id)} />
          <input type="hidden" name="type" value={type} />
          <select name="status" defaultValue="">
            <option value="" disabled>
              Action
            </option>
            {options.map((x) => (
              <option value={x} key={x}>
                {x}
              </option>
            ))}
          </select>
          <button>Apply</button>
        </form>
      </div>
    </div>
  );
}
function AdminSettings({ data }: { data: DashboardData }) {
  const setting = (key: string) => object(data.settings.find((row) => string(row.key) === key)?.value);
  const revenue = setting("finance.revenue_split"), payout = setting("finance.payout_policy"), refund = setting("finance.refund_policy"), support = setting("support.contact");
  const standardKeys = new Set(["finance.revenue_split", "finance.payout_policy", "finance.refund_policy", "support.contact"]);
  const customSettings = data.settings.filter((row) => !standardKeys.has(string(row.key)));
  return (
    <div className="dashboard-page admin-settings-page">
      <PageHead
        title="Settings"
        subtitle="Manage marketplace categories and non-secret public configuration."
      />
      <section className="panel settings-section">
        <div className="settings-section-head">
          <div><span className="settings-icon">C</span><div><h3>Course categories</h3><p>Organise courses and control what learners can browse.</p></div></div>
          <span>{data.categories.length} categories</span>
        </div>
        <div className="settings-category-list">
          {data.categories.map((row, index) => (
            <form action={saveCategory} className="settings-category-row" key={string(row.id)}>
              <input type="hidden" name="id" value={string(row.id)} />
              <span className="settings-row-number">{index + 1}</span>
              <label>Name<input name="name" defaultValue={string(row.name)} required /></label>
              <label className="settings-description">Description<input name="description" defaultValue={string(row.description)} placeholder="Describe this category" /></label>
              <label className="settings-order">Order<input name="sort_order" type="number" min="0" defaultValue={number(row.sort_order)} /></label>
              <label className="settings-toggle"><input name="is_active" type="checkbox" defaultChecked={Boolean(row.is_active)} /><span aria-hidden="true" /> Active</label>
              <button className="outline-button">Save changes</button>
            </form>
          ))}
        </div>
        <form action={saveCategory} className="settings-add-category">
          <div><b>Add a new category</b><small>Create another section for marketplace courses.</small></div>
          <label>Name<input name="name" placeholder="e.g. Business" required /></label>
          <label>Description<input name="description" placeholder="What learners will find here" /></label>
          <label>Order<input name="sort_order" type="number" min="0" defaultValue="0" /></label>
          <label className="settings-toggle"><input name="is_active" type="checkbox" defaultChecked /><span aria-hidden="true" /> Active</label>
          <button className="button">Add category</button>
        </form>
      </section>
      <section className="panel settings-section">
        <div className="settings-section-head">
          <div><span className="settings-icon">P</span><div><h3>Public configuration</h3><p>Non-secret values that may be visible across Mahadum.</p></div></div>
          <span>4 groups</span>
        </div>
        <div className="settings-editor-grid">
          <form action={savePlatformSetting} className="settings-editor-card">
            <input type="hidden" name="setting_key" value="finance.revenue_split" />
            <div className="settings-editor-head"><span>₦</span><div><h4>Revenue split</h4><p>How each completed sale is distributed.</p></div></div>
            <div className="settings-field-grid four">
              <label>Creator share (%)<input name="creator_percent" type="number" min="0" max="100" step="0.01" defaultValue={number(revenue.creator_bps) / 100} required /></label>
              <label>Mahadum share (%)<input name="platform_percent" type="number" min="0" max="100" step="0.01" defaultValue={number(revenue.platform_bps) / 100} required /></label>
              <label>Affiliate level one (%)<input name="affiliate_level_one_percent" type="number" min="0" max="100" step="0.01" defaultValue={number(revenue.affiliate_level_one_bps) / 100} required /></label>
              <label>Affiliate level two (%)<input name="affiliate_level_two_percent" type="number" min="0" max="100" step="0.01" defaultValue={number(revenue.affiliate_level_two_bps) / 100} required /></label>
            </div>
            <small className="settings-help">All four percentages must total 100%.</small><button className="button">Save revenue split</button>
          </form>
          <form action={savePlatformSetting} className="settings-editor-card">
            <input type="hidden" name="setting_key" value="finance.payout_policy" />
            <div className="settings-editor-head"><span>P</span><div><h4>Payout policy</h4><p>Control when creators and affiliates can withdraw.</p></div></div>
            <div className="settings-field-grid"><label>Minimum payout (NGN)<input name="minimum_ngn" type="number" min="0" step="100" defaultValue={number(payout.minimum_minor) / 100} required /></label><label>Payout schedule<select name="schedule" defaultValue={string(payout.schedule) || "weekly_friday"}><option value="daily">Daily</option><option value="weekly_friday">Every Friday</option><option value="twice_monthly">Twice monthly</option><option value="monthly">Monthly</option><option value="manual">Manual</option></select></label></div>
            <small className="settings-help">Settlement hold is disabled.</small><button className="button">Save payout policy</button>
          </form>
          <form action={savePlatformSetting} className="settings-editor-card">
            <input type="hidden" name="setting_key" value="finance.refund_policy" />
            <div className="settings-editor-head"><span>R</span><div><h4>Refund policy</h4><p>Set the request window and eligibility summary.</p></div></div>
            <div className="settings-field-grid"><label>Refund window (days)<input name="window_days" type="number" min="0" max="365" defaultValue={number(refund.window_days)} required /></label><label>Eligibility summary<input name="eligibility" defaultValue={string(refund.eligibility)} required /></label></div>
            <button className="button">Save refund policy</button>
          </form>
          <form action={savePlatformSetting} className="settings-editor-card">
            <input type="hidden" name="setting_key" value="support.contact" />
            <div className="settings-editor-head"><span>@</span><div><h4>Support contact</h4><p>Public contact details shown to customers.</p></div></div>
            <div className="settings-field-grid"><label>Support email<input name="email" type="email" defaultValue={string(support.email)} required /></label><label>Response target (hours)<input name="response_target_hours" type="number" min="1" max="720" defaultValue={number(support.response_target_hours)} required /></label></div>
            <button className="button">Save support contact</button>
          </form>
        </div>
        {customSettings.length ? <div className="custom-settings-list"><h4>Other public settings</h4>{customSettings.map((row)=><div key={string(row.key)}><b>{string(row.key).replace(/^public\./, "").replaceAll(".", " ")}</b><span>{string(object(row.value).value) || "Configured"}</span></div>)}</div> : null}
      </section>
    </div>
  );
}

function AdminSection({
  section,
  data,
}: {
  section: string;
  data: DashboardData;
}) {
  let source: Row[] = data.users;
  if (section === "courses") source = data.courses;
  else if (section === "creators") source = data.creators;
  else if (section === "affiliates") source = data.affiliates;
  else if (section === "finance")
    source = [...data.payments, ...data.refunds, ...data.payouts];
  else if (section === "audit-log") source = data.audit;
  else if (section === "learners")
    source = data.users.filter((x) =>
      list(x.user_roles).some((r) => r.role === "learner"),
    );
  if (section === "finance") return <FinanceAdmin data={data} />;
  if (section === "users")
    return (
      <AdminUsers
        users={data.users}
        courses={data.courses.filter((course) => course.status === "published")}
        currentUserId={data.userId}
      />
    );
  if (section === "courses")
    return <AdminCourses courses={data.courses} categories={data.categories} />;
  if (section === "affiliates")
    return <AdminAffiliates affiliates={data.affiliates} />;
  if (section === "settings") return <AdminSettings data={data} />;
  if (section === "overview" || section === "analytics")
    return <Overview role="admin" data={data} />;
  return (
    <div className="dashboard-page">
      <PageHead
        title={section.replaceAll("-", " ")}
        subtitle={`Live ${section.replaceAll("-", " ")} records from Supabase.`}
      />
      <section className="panel table-panel">
        {source.length === 0 ? (
          <Empty text={`No ${section.replaceAll("-", " ")} records yet.`} />
        ) : (
          source.map((row, index) => {
            const title =
              string(row.title) ||
              string(row.full_name) ||
              string(object(row.profiles).full_name) ||
              string(row.action) ||
              string(row.tx_ref) ||
              string(row.code) ||
              `Record ${index + 1}`;
            const status =
              string(row.status) || string(row.verification_status) || "active";
            return (
              <div
                className="data-row"
                key={
                  string(row.id) || string(row.user_id) || `${section}-${index}`
                }
              >
                <span className="user-avatar">
                  {title.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <b>{title}</b>
                  <small>
                    {string(row.email) ||
                      string(row.entity_type) ||
                      date(row.created_at || row.requested_at)}
                  </small>
                </div>
                <span>
                  {row.amount_minor !== undefined
                    ? money(
                        number(row.amount_minor),
                        string(row.currency) || "NGN",
                      )
                    : date(row.created_at)}
                </span>
                <span className={`status ${status}`}>{status}</span>
                <div className="row-actions">
                  {section === "creators" && status === "pending" && (
                    <>
                      <ModerateCreator
                        id={string(row.user_id)}
                        status="verified"
                        label="Verify"
                      />
                      <ModerateCreator
                        id={string(row.user_id)}
                        status="rejected"
                        label="Reject"
                      />
                    </>
                  )}
                  {section === "affiliates" && status === "pending" && (
                    <>
                      <ModerateAffiliate
                        id={string(row.user_id)}
                        status="approved"
                        label="Approve"
                      />
                      <ModerateAffiliate
                        id={string(row.user_id)}
                        status="rejected"
                        label="Reject"
                      />
                    </>
                  )}
                  {section === "affiliates" && (
                    <form
                      action={updateAffiliateCommissions}
                      className="affiliate-rate-form"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={string(row.user_id)}
                      />
                      <label>
                        Level one (%)
                        <input
                          name="level_one_percent"
                          type="number"
                          min="0"
                          max="30"
                          step="0.01"
                          defaultValue={number(row.level_one_bps) / 100}
                          required
                        />
                      </label>
                      <label>
                        Level two (%)
                        <input
                          name="level_two_percent"
                          type="number"
                          min="0"
                          max="30"
                          step="0.01"
                          defaultValue={number(row.level_two_bps) / 100}
                          required
                        />
                      </label>
                      <button className="outline-button" type="submit">
                        Save commissions
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function ModerateCreator({
  id,
  status,
  label,
}: {
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={moderateCreator}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button>{label}</button>
    </form>
  );
}
function ModerateAffiliate({
  id,
  status,
  label,
}: {
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={moderateAffiliate}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button>{label}</button>
    </form>
  );
}
function Overview({ role, data }: { role: string; data: DashboardData }) {
  const revenue = data.ledger
    .filter((x) => number(x.amount_minor) > 0)
    .reduce((sum, x) => sum + number(x.amount_minor), 0);
  const metrics =
    role === "admin"
      ? [
          { label: "Users", value: data.users.length },
          { label: "Courses", value: data.courses.length },
          {
            label: "Verified payments",
            value: data.payments.filter((x) => x.status === "successful")
              .length,
          },
          {
            label: "Ledger volume",
            value: money(
              data.ledger.reduce(
                (s, x) => s + Math.max(0, number(x.amount_minor)),
                0,
              ),
            ),
          },
        ]
      : [
          { label: "Courses", value: data.courses.length },
          { label: "Settled earnings", value: money(revenue) },
          { label: "Payout requests", value: data.payouts.length },
          {
            label: "Affiliate status",
            value: string(data.affiliates[0]?.status) || "Not enrolled",
          },
        ];
  return (
    <div className="dashboard-page">
      <PageHead
        title={`Welcome, ${data.name}`}
        subtitle="Live operational data—no demonstration records."
      />
      <div className="metric-grid">
        {metrics.map((x) => (
          <article className="metric-card" key={x.label}>
            <span>{x.label}</span>
            <strong>{x.value}</strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <h3>Recent activity</h3>
        <p>
          {role === "admin"
            ? `${data.audit.length} recent audited events available.`
            : data.courses.length
              ? "Your course and earnings records are current."
              : "Create your first course to begin."}
        </p>
      </section>
    </div>
  );
}
function PageHead({
  title,
  subtitle,
  action,
  actionHref,
}: {
  title: string;
  subtitle: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && actionHref && (
        <Link className="button button-small" href={actionHref}>
          {action}
        </Link>
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <b>Nothing here yet</b>
      <p>{text}</p>
    </div>
  );
}
