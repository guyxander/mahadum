import Link from "next/link";
import type { DashboardData, Row } from "@/lib/dashboard";
import { addFirstLesson, addLesson, addModule, deleteLesson, deleteModule, saveCourse, submitCourse, updateLesson, updateModule } from "@/app/dashboard/actions";
import { AssetUploader } from "@/components/asset-uploader";
import { youtubeVideoId } from "@/lib/youtube";

const string = (value: unknown) => typeof value === "string" ? value : "";
const number = (value: unknown) => typeof value === "number" ? value : 0;
const list = (value: unknown) => Array.isArray(value) ? value as Row[] : [];

function Progress({ step }: { step: string }) {
  const active = step === "details" ? 0 : step === "modules" ? 1 : 2;
  return <nav className="wizard-progress" aria-label="Course creation progress">{[["1", "Course details"], ["2", "Modules & lessons"], ["3", "Review & submit"]].map(([count, label], index) => <div className={index === active ? "active" : index < active ? "complete" : ""} key={label}><span>{index < active ? "✓" : count}</span><b>{label}</b></div>)}</nav>;
}

function DetailsForm({ categories, course }: { categories: Row[]; course?: Row }) {
  return <form action={saveCourse} className="crud-form">
    <input type="hidden" name="id" value={string(course?.id)} />
    <label>Course title<input name="title" defaultValue={string(course?.title)} required /></label>
    <label>Short description<input name="short_description" defaultValue={string(course?.short_description)} maxLength={180} required /></label>
    <label>Full description<textarea name="description" defaultValue={string(course?.description)} required /></label>
    <div className="form-row"><label>Category<select name="category_id" defaultValue={string(course?.category_id)} required><option value="">Select category</option>{categories.map((category) => <option value={string(category.id)} key={string(category.id)}>{string(category.name)}</option>)}</select></label><label>Price (NGN)<input name="price" type="number" min="0" step="100" defaultValue={course ? number(course.price_minor) / 100 : undefined} required /></label></div>
    <button className="button">Next: Add modules</button>
  </form>;
}

export function CourseBuilderWizard({ data, courseId, step }: { data: DashboardData; courseId?: string; step?: string }) {
  const course = data.courses.find((item) => string(item.id) === courseId);
  const current = course ? step === "review" ? "review" : step === "modules" ? "modules" : "details" : "details";
  const modules = course ? [...list(course.course_modules)].sort((a, b) => number(a.position) - number(b.position)) : [];
  const lessons = modules.flatMap((module) => list(module.lessons));
  const videoLessons = lessons.filter((lesson) => youtubeVideoId(string(lesson.video_url)));
  const ready = modules.length > 0 && videoLessons.length > 0;
  const base = course ? `/dashboard/creator/course-builder?course=${string(course.id)}` : "/dashboard/creator/course-builder";
  return <div className="dashboard-page">
    <div className="page-head"><div><h1>Course builder</h1><p>Complete all three steps before submitting your course.</p></div></div>
    <Progress step={current} />
    {current === "details" ? <section className="panel wizard-panel"><span className="overline">Step 1 of 3</span><h3>{course ? "Course details" : "Create a new course"}</h3><p>Start with the information learners will see in the marketplace.</p><DetailsForm categories={data.categories} course={course} /></section> : null}
    {course && current === "modules" ? <section className="panel course-editor"><span className="overline">Step 2 of 3</span><h3>Modules and lessons</h3><p className="wizard-copy">Add at least one module and one lesson with a valid YouTube link.</p><AssetUploader userId={data.userId} courseId={string(course.id)} />
      {modules.length === 0 ? <form action={addFirstLesson} className="first-lesson-form"><input type="hidden" name="course_id" value={string(course.id)} /><div><h3>Add your first module and lesson</h3><p>A module named “Course lessons” will be created automatically.</p></div><label>Lesson title<input name="title" required placeholder="Introduction" /></label><label>YouTube video link<input name="video_url" type="url" required placeholder="https://youtu.be/..." /></label><label>Duration (minutes)<input name="duration_minutes" type="number" min="0" /></label><label className="first-lesson-description">Lesson description<textarea name="description" /></label><button className="button">Save first lesson</button></form> : null}
      <form action={addModule} className="inline-form"><input type="hidden" name="course_id" value={string(course.id)} /><input name="title" required placeholder="New module title" /><button className="outline-button">Add module</button></form>
      {modules.map((module) => <div className="module-editor" key={string(module.id)}><form action={updateModule} className="inline-form"><input type="hidden" name="id" value={string(module.id)} /><input name="title" defaultValue={string(module.title)} required /><button className="outline-button">Rename</button></form>
        {list(module.lessons).sort((a,b) => number(a.position)-number(b.position)).map((lesson) => <details className="lesson-row" key={string(lesson.id)}><summary>{number(lesson.position)+1}. {string(lesson.title)}</summary><form action={updateLesson} className="crud-form compact"><input type="hidden" name="id" value={string(lesson.id)} /><input name="title" defaultValue={string(lesson.title)} required /><label>YouTube video link<input name="video_url" type="url" defaultValue={string(lesson.video_url)} required /></label><input name="duration_minutes" type="number" min="0" defaultValue={Math.ceil(number(lesson.duration_seconds)/60)} /><textarea name="description" defaultValue={string(lesson.description)} /><label className="check"><input name="is_free_preview" type="checkbox" defaultChecked={Boolean(lesson.is_free_preview)} /> Free preview</label><button className="outline-button">Update lesson</button></form><form action={deleteLesson}><input type="hidden" name="id" value={string(lesson.id)} /><button className="danger-button">Delete lesson</button></form></details>)}
        <form action={addLesson} className="crud-form compact"><input type="hidden" name="module_id" value={string(module.id)} /><input name="title" required placeholder="Lesson title" /><label>YouTube video link<input name="video_url" type="url" required placeholder="https://youtu.be/..." /></label><input name="duration_minutes" type="number" min="0" placeholder="Minutes" /><textarea name="description" placeholder="Lesson description" /><label className="check"><input name="is_free_preview" type="checkbox" /> Free preview</label><button className="outline-button">Add lesson</button></form><form action={deleteModule}><input type="hidden" name="id" value={string(module.id)} /><button className="danger-button">Delete module</button></form></div>)}
      <div className="wizard-actions"><Link className="outline-button" href={`${base}&step=details`}>Back</Link>{ready ? <Link className="button" href={`${base}&step=review`}>Next: Review course</Link> : <span className="wizard-hint">Add a module and YouTube lesson to continue.</span>}</div>
    </section> : null}
    {course && current === "review" ? <section className="panel wizard-panel"><span className="overline">Step 3 of 3</span><h3>Review and submit</h3><div className="review-summary"><div><span>Course</span><strong>{string(course.title)}</strong></div><div><span>Modules</span><strong>{modules.length}</strong></div><div><span>Video lessons</span><strong>{videoLessons.length}</strong></div><div><span>Status</span><strong>{string(course.status)}</strong></div></div><p>Submitting sends this draft to Mahadum for review.</p><div className="wizard-actions"><Link className="outline-button" href={`${base}&step=modules`}>Back</Link>{ready && string(course.status) === "draft" ? <form action={submitCourse}><input type="hidden" name="id" value={string(course.id)} /><button className="button">Submit course for review</button></form> : <span className="wizard-hint">A valid YouTube lesson is required.</span>}</div></section> : null}
  </div>;
}
