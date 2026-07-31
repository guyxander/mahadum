"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { adminUpdateCourse, moderateCourse } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/browser";
import type { Row } from "@/lib/dashboard";

const text=(value:unknown)=>typeof value==="string"?value:"";
const object=(value:unknown)=>value&&typeof value==="object"&&!Array.isArray(value)?value as Row:{};
const number=(value:unknown)=>typeof value==="number"?value:Number(value)||0;
const date=(value:unknown)=>value?new Intl.DateTimeFormat("en-NG",{dateStyle:"medium"}).format(new Date(String(value))):"—";
const money=(minor:unknown,currency:unknown)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:text(currency)||"NGN",maximumFractionDigits:0}).format(number(minor)/100);
const enrollmentCount=(course:Row)=>{const value=course.enrollments;return Array.isArray(value)?number(object(value[0]).count):0};
const browserClient=createClient();
const thumbnail=(path:unknown)=>{const value=text(path);if(!value)return "";return browserClient.storage.from("course-thumbnails").getPublicUrl(value).data.publicUrl};

export function AdminCourses({courses,categories}:{courses:Row[];categories:Row[]}){
  const [query,setQuery]=useState("");const [status,setStatus]=useState("all");const [category,setCategory]=useState("all");const [sort,setSort]=useState("newest");
  const filtered=useMemo(()=>courses.filter(course=>{const creator=text(object(course.profiles).full_name);const haystack=`${text(course.title)} ${creator}`.toLowerCase();return haystack.includes(query.toLowerCase())&&(status==="all"||course.status===status)&&(category==="all"||course.category_id===category)}).sort((a,b)=>{if(sort==="title")return text(a.title).localeCompare(text(b.title));if(sort==="enrollments")return enrollmentCount(b)-enrollmentCount(a);return new Date(String(b.created_at)).getTime()-new Date(String(a.created_at)).getTime()}),[courses,query,status,category,sort]);
  const counts={total:courses.length,published:courses.filter(x=>x.status==="published").length,draft:courses.filter(x=>x.status==="draft").length,archived:courses.filter(x=>x.status==="archived").length};
  return <div className="dashboard-page admin-courses-page">
    <div className="page-head"><div><h1>Courses</h1><p>Review, publish, and manage every course on Mahadum.</p></div></div>
    <div className="metric-grid admin-course-metrics"><article className="metric-card"><span>Total courses</span><strong>{counts.total}</strong></article><article className="metric-card"><span>Published</span><strong>{counts.published}</strong></article><article className="metric-card"><span>Drafts</span><strong>{counts.draft}</strong></article><article className="metric-card"><span>Archived</span><strong>{counts.archived}</strong></article></div>
    <section className="panel admin-courses-panel">
      <div className="admin-course-tools"><label><span>Search courses</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Title or creator"/></label><label><span>Status</span><select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label><label><span>Category</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item=><option key={text(item.id)} value={text(item.id)}>{text(item.name)}</option>)}</select></label><label><span>Sort</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="newest">Newest first</option><option value="title">Course title</option><option value="enrollments">Most enrolled</option></select></label></div>
      <div className="admin-course-header"><span>Course</span><span>Creator</span><span>Price</span><span>Enrolments</span><span>Updated</span><span>Status</span><span>Actions</span></div>
      <div className="admin-course-list">{filtered.length===0?<div className="empty-state"><b>No matching courses</b><p>Try changing your search or filters.</p></div>:filtered.map(course=>{const statusValue=text(course.status)||"draft";const image=thumbnail(course.thumbnail_path);return <article className="admin-course-row" key={text(course.id)}>
        <div className="admin-course-title">{image?<span className="admin-course-thumb" style={{backgroundImage:`url(${image})`}} aria-hidden="true"/>:<span>{text(course.title).slice(0,2).toUpperCase()}</span>}<div><b>{text(course.title)||"Untitled course"}</b><small>{text(object(course.categories).name)||"Uncategorised"}</small></div></div>
        <span className="admin-course-creator"><small>Creator</small>{text(object(course.profiles).full_name)||"Unknown creator"}</span><span className="admin-course-price"><small>Price</small>{money(course.price_minor,course.currency)}</span><span className="admin-course-enrolments"><small>Enrolments</small>{enrollmentCount(course)}</span><span className="admin-course-updated"><small>Updated</small>{date(course.updated_at)}</span><span className={`status ${statusValue}`}>{statusValue.replace("_"," ")}</span>
        <div className="admin-course-actions"><details><summary>Manage</summary><div className="admin-course-menu"><Link href={`/courses/${text(course.slug)}`}>View course</Link><form action={adminUpdateCourse}><input type="hidden" name="id" value={text(course.id)}/><b>Edit core details</b><label>Title<input name="title" defaultValue={text(course.title)} required/></label><label>Category<select name="category_id" defaultValue={text(course.category_id)}><option value="">Uncategorised</option>{categories.map(item=><option key={text(item.id)} value={text(item.id)}>{text(item.name)}</option>)}</select></label><label>Price (NGN)<input name="price" type="number" min="0" step="100" defaultValue={number(course.price_minor)/100} required/></label><label className="admin-course-check"><input name="is_featured" type="checkbox" defaultChecked={Boolean(course.is_featured)}/> Featured course</label><button className="outline-button">Save details</button></form><div className="admin-course-moderation">{statusValue!=="published"&&<CourseStatus id={text(course.id)} status="published" label="Publish"/>}{statusValue==="published"&&<CourseStatus id={text(course.id)} status="archived" label="Unpublish"/>}</div></div></details></div>
      </article>})}</div>
    </section>
  </div>;
}

function CourseStatus({id,status,label}:{id:string;status:string;label:string}){return <form action={moderateCourse}><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={status}/><button className="outline-button">{label}</button></form>}
