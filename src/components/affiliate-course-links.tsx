"use client";

import Link from "next/link";
import { useState } from "react";

type AffiliateCourse = { id:string;title:string;slug:string;shortDescription:string;priceMinor:number;currency:string };
const money=(minor:number,currency:string)=>new Intl.NumberFormat("en-NG",{style:"currency",currency,maximumFractionDigits:0}).format(minor/100);

export function AffiliateCourseLinks({code,courses,siteUrl}:{code:string;courses:AffiliateCourse[];siteUrl:string}){
  const [copied,setCopied]=useState<string|null>(null);
  async function copy(course:AffiliateCourse){const url=`${siteUrl}/courses/${encodeURIComponent(course.slug)}?ref=${encodeURIComponent(code)}`;await navigator.clipboard.writeText(url);setCopied(course.id);window.setTimeout(()=>setCopied(current=>current===course.id?null:current),2000)}
  async function copyNetworkLink(){const url=`${siteUrl}/signup?ref=${encodeURIComponent(code)}`;await navigator.clipboard.writeText(url);setCopied("affiliate-network");window.setTimeout(()=>setCopied(current=>current==="affiliate-network"?null:current),2000)}
  return <><section className="panel affiliate-links-panel"><div className="panel-head"><div><h3>Refer other affiliates</h3><p>Anyone who creates an account through this link joins your affiliate network as a level-two referral.</p></div><button className="button" type="button" data-async-action onClick={copyNetworkLink}>{copied==="affiliate-network"?"Copied":"Copy affiliate referral link"}</button></div></section><section className="panel affiliate-links-panel"><div className="panel-head"><div><h3>Course affiliate links</h3><p>Share a course-specific link. Eligible purchases made through it are attributed to your affiliate code.</p></div></div>{courses.length===0?<div className="empty-state"><b>No published courses available</b><p>Links will appear here as soon as a course is published.</p></div>:<div className="affiliate-course-list">{courses.map(course=>{const href=`/courses/${course.slug}?ref=${encodeURIComponent(code)}`;return <article className="affiliate-course-row" key={course.id}><div><h4>{course.title}</h4><p>{course.shortDescription}</p><small>{money(course.priceMinor,course.currency)}</small></div><div className="affiliate-link-actions"><Link className="outline-button" href={href}>Open link</Link><button className="button" type="button" data-async-action onClick={()=>copy(course)}>{copied===course.id?"Copied":"Copy affiliate link"}</button></div></article>})}</div>}</section></>;
}
