import { createClient } from "@/lib/supabase/server";

export type Row=Record<string,unknown>;
export type DashboardData={userId:string;name:string;email:string;profile:Row|null;categories:Row[];courses:Row[];enrollments:Row[];progress:Row[];certificates:Row[];reviews:Row[];users:Row[];creators:Row[];payments:Row[];refunds:Row[];payouts:Row[];ledger:Row[];affiliates:Row[];audit:Row[];settings:Row[]};
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[];

export async function loadDashboard(role:string){
  const client=await createClient();if(!client)return null;
  const {data:{user}}=await client.auth.getUser();if(!user)return null;
  const base:DashboardData={userId:user.id,name:String(user.user_metadata?.full_name||user.email?.split("@")[0]||"Member"),email:user.email||"",profile:null,categories:[],courses:[],enrollments:[],progress:[],certificates:[],reviews:[],users:[],creators:[],payments:[],refunds:[],payouts:[],ledger:[],affiliates:[],audit:[],settings:[]};
  const [{data:profile},{data:categories}]=await Promise.all([client.from("profiles").select("*").eq("id",user.id).maybeSingle(),client.from("categories").select("*").order("sort_order")]);
  base.profile=profile as Row|null;base.categories=rows(categories);base.name=String(profile?.full_name||base.name);
  if(role==="creator"){
    const results=await Promise.all([client.from("courses").select("*, categories(name), course_modules(id,title,position,lessons(id,title,description,video_url,duration_seconds,position,is_free_preview))").eq("creator_id",user.id).order("created_at",{ascending:false}),client.from("ledger_entries").select("*").eq("owner_id",user.id).order("created_at",{ascending:false}),client.from("payouts").select("*").eq("user_id",user.id).order("requested_at",{ascending:false}),client.from("affiliates").select("*").eq("user_id",user.id)]);
    [base.courses,base.ledger,base.payouts,base.affiliates]=results.map(x=>rows(x.data));
  }else if(role==="learner"){
    const results=await Promise.all([client.from("enrollments").select("*, courses(id,title,slug,short_description,course_modules(id,lessons(id,title,position)))").eq("learner_id",user.id).order("enrolled_at",{ascending:false}),client.from("lesson_progress").select("*").order("updated_at",{ascending:false}),client.from("certificates").select("*, enrollments!inner(learner_id,completed_at,courses(title))").eq("enrollments.learner_id",user.id),client.from("payments").select("*, courses(title)").eq("learner_id",user.id).order("created_at",{ascending:false}),client.from("courses").select("*, categories(name)").eq("status","published").order("published_at",{ascending:false}),client.from("reviews").select("*").eq("learner_id",user.id)]);
    [base.enrollments,base.progress,base.certificates,base.payments,base.courses,base.reviews]=results.map(x=>rows(x.data));
  }else{
    const results=await Promise.all([client.from("profiles").select("*, user_roles(role)").order("created_at",{ascending:false}),client.from("courses").select("*, categories(name), profiles!courses_creator_id_fkey(full_name)").order("created_at",{ascending:false}),client.from("creator_profiles").select("*, profiles(full_name)").order("verification_status"),client.from("payments").select("*, courses(title)").order("created_at",{ascending:false}),client.from("refunds").select("*, payments(tx_ref)").order("created_at",{ascending:false}),client.from("payouts").select("*, profiles(full_name)").order("requested_at",{ascending:false}),client.from("ledger_entries").select("*").order("created_at",{ascending:false}),client.from("affiliates").select("*, profiles(full_name)").order("status"),client.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(100),client.from("platform_settings").select("*").order("key")]);
    [base.users,base.courses,base.creators,base.payments,base.refunds,base.payouts,base.ledger,base.affiliates,base.audit,base.settings]=results.map(x=>rows(x.data));
  }
  return base;
}
