import type { MetadataRoute } from "next";
export default function sitemap():MetadataRoute.Sitemap{return ["","/login","/signup"].map(path=>({url:`https://mahadum.com${path}`,lastModified:new Date(),changeFrequency:path?"monthly":"weekly",priority:path?0.6:1}))}
