"use client";

export function DeleteCourseButton({ courseId, courseTitle, action }: { courseId: string; courseTitle: string; action: (data: FormData) => void | Promise<void> }) {
  return (
    <form action={action} onSubmit={(event) => { if (!window.confirm(`Delete “${courseTitle}”? This permanently removes its modules and lessons.`)) event.preventDefault(); }}>
      <input type="hidden" name="id" value={courseId} />
      <button className="delete-course-button">Delete</button>
    </form>
  );
}
