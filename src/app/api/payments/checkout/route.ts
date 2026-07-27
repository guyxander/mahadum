import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  const client=await createClient(); if(!client)return NextResponse.json({error:"Database is not configured"},{status:503});
  const {data:{user}}=await client.auth.getUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const body = await request.json() as { courseId?: string };
  if (!body.courseId) return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  const {data:course}=await client.from("courses").select("id,title,price_minor,currency,status").eq("id",body.courseId).eq("status","published").single();
  if(!course)return NextResponse.json({error:"Course not found"},{status:404});
  const txRef = `mahadum-${randomUUID()}`;
  const {error:paymentError}=await client.from("payments").insert({learner_id:user.id,course_id:course.id,tx_ref:txRef,amount_minor:course.price_minor,currency:course.currency});
  if(paymentError)return NextResponse.json({error:"Unable to create payment"},{status:500});
  const response = await fetch("https://api.flutterwave.com/v3/payments", { method:"POST", headers:{ Authorization:`Bearer ${secret}`, "Content-Type":"application/json" }, body:JSON.stringify({ tx_ref:txRef, amount:course.price_minor/100, currency:course.currency, redirect_url:`${new URL(request.url).origin}/checkout/complete`, customer:{email:user.email}, meta:{course_id:course.id,user_id:user.id} }) });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error:"Unable to start payment" },{status:502});
  return NextResponse.json({ checkoutUrl: result.data?.link, txRef });
}
