"use client";
import { useEffect } from "react";

export function CourseVisitTracker({ courseId, affiliateCode }: { courseId: string; affiliateCode?: string }) {
  useEffect(() => {
    const key = `mahadum-visit:${courseId}:${affiliateCode || "direct"}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/analytics/course-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseId, affiliateCode, eventType: "visit" }), keepalive: true });
  }, [courseId, affiliateCode]);
  return null;
}
