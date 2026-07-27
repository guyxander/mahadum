import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get("code");const requested=url.searchParams.get("next")||"/";const next=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/";if(code){const client=await createClient();if(client){const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,url.origin));console.error("[auth/callback] code exchange failed",{code:error.code,status:error.status});}}return NextResponse.redirect(new URL("/login?message=This+recovery+link+is+invalid+or+expired.+Request+a+new+one.",url.origin));}
