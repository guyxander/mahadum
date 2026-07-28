import Link from "next/link";
import type { DashboardData, Row } from "@/lib/dashboard";
import {
  addFirstLesson,
  addLesson,
  addModule,
  deleteLesson,
  deleteModule,
  saveCourse,
  submitCourse,
  updateLesson,
  updateModule,
} from "@/app/dashboard/actions";
import { AssetUploader } from "@/components/asset-uploader";
import { youtubeVideoId } from "@/lib/youtube";

const string = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) => (typeof value === "number" ? value : 0);
const list = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);

function Progress({ step }: { step: string }) {
  const active = step === "details" ? 0 : step === "modules" ? 1 : 2;
  const steps = ["Course details", "Modules & lessons", "Review & submit"];
  return (
    <nav className="wizard-progress" aria-label="Course creation progress">
      {steps.map((label, index) => (
        <div className={index === active ? "active" : index < active ? "complete" : ""} key={label}>
          <span>{index < active ? "✓" : index + 1}</span><b>{label}</b>
        </div>
      ))}
    </nav>
  );
}

function DetailsForm({ categories, course }: { categories: Row[]; course?: Row }) {
  return (
    <form action={saveCourse} className="crud-form">
      <input type="hidden" name="id" value={string(course?.id)} />
      <label>Course title<input name="title" defaultValue={string(course?.title)} required /></label>
      <label>Short description<input name="short_description" defaultValue={string(course?.short_description)} maxLength={180} required /></label>
      <label>Full description<textarea name="description" defaultValue={string(course?.description)} required /></label>
      <div className="form-row">
        <label>Category<select name="category_id" defaultValue={string(course?.category_id)} required><option value="">Select category</option>{categories.map((category) => <option value={string(category.id)} key={string(category.id)}>{string(category.name)}</option>)}</select></label>
        <label>Price (NGN)<input name="price" type="number" min="0" step="100" defaultValue={course ? number(course.price_minor) / 100 : undefined} required /></label>
      </div>
      <button className="button">Next: Add modules</button>
    </form>
  );
}

function LessonFields({ lesson }: { lesson?: Row }) {
  return <>
    {lesson ? <input type="hidden" name="id" value={string(lesson.id)} /> : null}
    <label>Lesson title<input name="title" defaultValue={string(lesson?.title)} required placeholder="e.g. Introduction" /></label>
    <label>YouTube video link<input name="video_url" type="url" defaultValue={string(lesson?.video_url)} required placeholder="https://youtu.be/..." /></label>
    <label>Duration (minutes)<input name="duration_minutes" type="number" min="0" defaultValue={lesson ? Math.ceil(number(lesson.duration_seconds) / 60) : undefined} /></label>
    <label className="wide-field">Lesson description<textarea name="description" defaultValue={string(lesson?.description)} placeholder="What will learners cover?" /></label>
    <label className="check"><input name="is_free_preview" type="checkbox" defaultChecked={Boolean(lesson?.is_free_preview)} /> Free preview</label>
  </>;
}

export function CourseBuilderWizard({ data, courseId, step }: { data: DashboardData; courseId?: string; step?: string }) {
  const course = data.courses.find((item) => string(item.id) === courseId);
  const current = course ? (step === "review" ? "review" : step === "modules" ? "modules" : "details") : "details";
  const modules = course ? [...list(course.course_modules)].sort((a, b) => number(a.position) - number(b.position)) : [];
  const lessons = modules.flatMap((module) => list(module.lessons));
  const videoLessons = lessons.filter((lesson) => youtubeVideoId(string(lesson.video_url)));
  const ready = modules.length > 0 && videoLessons.length > 0;
  const base = course ? `/dashboard/creator/course-builder?course=${string(course.id)}` : "/dashboard/creator/course-builder";

  return <div className="dashboard-page">
    <div className="page-head"><div><h1>Course builder</h1><p>Complete all three steps before submitting your course.</p></div></div>
    <Progress step={current} />

    {current === "details" ? <section className="panel wizard-panel"><span className="overline">Step 1 of 3</span><h3>{course ? "Course details" : "Create a new course"}</h3><p>Start with the information learners will see in the marketplace.</p><DetailsForm categories={data.categories} course={course} /></section> : null}

    {course && current === "modules" ? <section className="panel course-editor">
      <span className="overline">Step 2 of 3</span><h3>Build your course content</h3><p className="wizard-copy">Organise lessons into modules. Each lesson needs a valid YouTube link.</p>
      <div className="builder-optional"><strong>Course thumbnail <small>Optional</small></strong><AssetUploader userId={data.userId} courseId={string(course.id)} /></div>

      {modules.length === 0 ? <form action={addFirstLesson} className="first-lesson-form"><input type="hidden" name="course_id" value={string(course.id)} /><div><span className="overline">Module 1</span><h3>Add your first lesson</h3><p>We will create your first module automatically. You can rename it afterward.</p></div><LessonFields /><button className="button">Save first lesson</button></form> : null}

      {modules.map((module, moduleIndex) => {
        const moduleLessons = [...list(module.lessons)].sort((a, b) => number(a.position) - number(b.position));
        return <article className="module-editor" key={string(module.id)}>
          <header className="module-card-head"><div><span className="overline">Module {moduleIndex + 1}</span><h3>{string(module.title)}</h3><small>{moduleLessons.length} {moduleLessons.length === 1 ? "lesson" : "lessons"}</small></div><details><summary>Edit module name</summary><form action={updateModule} className="inline-form"><input type="hidden" name="id" value={string(module.id)} /><input name="title" defaultValue={string(module.title)} required /><button className="outline-button">Save name</button></form></details></header>
          <div className="saved-lessons"><h4>Saved lessons</h4>{moduleLessons.map((lesson, lessonIndex) => <details className="saved-lesson" key={string(lesson.id)}><summary><span>{lessonIndex + 1}</span><div><b>{string(lesson.title)}</b><small>{Math.ceil(number(lesson.duration_seconds) / 60)} min · YouTube video saved</small></div><em>Edit</em></summary><form action={updateLesson} className="lesson-edit-form"><LessonFields lesson={lesson} /><button className="outline-button">Save lesson changes</button></form><form action={deleteLesson} className="compact-danger"><input type="hidden" name="id" value={string(lesson.id)} /><button className="danger-button">Delete lesson</button></form></details>)}</div>
          <details className="add-lesson-panel"><summary>+ Add another lesson</summary><form action={addLesson} className="lesson-edit-form"><input type="hidden" name="module_id" value={string(module.id)} /><LessonFields /><button className="button">Save new lesson</button></form></details>
          <details className="module-danger"><summary>Module options</summary><form action={deleteModule}><input type="hidden" name="id" value={string(module.id)} /><button className="danger-button">Delete this module</button></form></details>
        </article>;
      })}

      {modules.length > 0 ? <details className="add-module-panel"><summary>+ Add another module</summary><form action={addModule} className="inline-form"><input type="hidden" name="course_id" value={string(course.id)} /><input name="title" required placeholder={`Module ${modules.length + 1} title`} /><button className="outline-button">Add module</button></form></details> : null}
      <div className="wizard-actions sticky-wizard-actions"><Link className="outline-button" href={`${base}&step=details`}>Back</Link>{ready ? <Link className="button" href={`${base}&step=review`}>Next: Review course</Link> : <span className="wizard-hint">Save one YouTube lesson to continue.</span>}</div>
    </section> : null}

    {course && current === "review" ? <section className="panel wizard-panel"><span className="overline">Step 3 of 3</span><h3>Review and submit</h3><div className="review-summary"><div><span>Course</span><strong>{string(course.title)}</strong></div><div><span>Modules</span><strong>{modules.length}</strong></div><div><span>Video lessons</span><strong>{videoLessons.length}</strong></div><div><span>Status</span><strong>{string(course.status)}</strong></div></div><p>Submitting sends this draft to Mahadum for review.</p><div className="wizard-actions"><Link className="outline-button" href={`${base}&step=modules`}>Back</Link>{ready && string(course.status) === "draft" ? <form action={submitCourse}><input type="hidden" name="id" value={string(course.id)} /><button className="button">Submit course for review</button></form> : <span className="wizard-hint">A valid YouTube lesson is required.</span>}</div></section> : null}
  </div>;
}
