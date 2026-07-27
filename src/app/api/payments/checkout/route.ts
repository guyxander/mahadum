import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  const client=await createClient(); if(!client)return NextResponse.json({error:"Database is not configured"},{status:503});
  const {data:{user}}=await client.auth.getUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const body = await request.json() as { courseId?: string; affiliateCode?:string };
  if (!body.courseId) return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  const txRef = `mahadum-${randomUUID()}`;
  const {data:checkout,error:paymentError}=await client.rpc("create_checkout",{p_course_id:body.courseId,p_tx_ref:txRef,p_affiliate_code:body.affiliateCode||null});
  if(paymentError||!checkout)return NextResponse.json({error:paymentError?.message||"Unable to create payment"},{status:400});
  const record=checkout as {course_id:string;amount_minor:number;currency:string;email:string};
  const response = await fetch("https://api.flutterwave.com/v3/payments", { method:"POST", headers:{ Authorization:`Bearer ${secret}`, "Content-Type":"application/json" }, body:JSON.stringify({ tx_ref:txRef, amount:record.amount_minor/100, currency:record.currency, redirect_url:`${new URL(request.url).origin}/checkout/complete`, customer:{email:record.email||user.email}, meta:{course_id:record.course_id,user_id:user.id} }) });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error:"Unable to start payment" },{status:502});
  return NextResponse.json({ checkoutUrl: result.data?.link, txRef });
}
