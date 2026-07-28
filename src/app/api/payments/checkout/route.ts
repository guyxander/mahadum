import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  const client=await createClient(); if(!client)return NextResponse.json({error:"Database is not configured"},{status:503});
  const {data:{user}}=await client.auth.getUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const body = await request.json() as { courseId?: string; affiliateCode?:string };
  if (!body.courseId) return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  const txRef = `mahadum-${randomUUID()}`;
  const {data:checkout,error:paymentError}=await client.rpc("create_checkout",{p_course_id:body.courseId,p_tx_ref:txRef,p_affiliate_code:body.affiliateCode||null});
  if(paymentError||!checkout)return NextResponse.json({error:paymentError?.message||"Unable to create payment"},{status:400});
  const record=checkout as {course_id:string;amount_minor:number;currency:string;email:string};
  const response = await fetch("https://api.paystack.co/transaction/initialize", { method:"POST", headers:{ Authorization:`Bearer ${secret}`, "Content-Type":"application/json" }, body:JSON.stringify({ reference:txRef, amount:String(record.amount_minor), email:record.email||user.email, currency:record.currency, callback_url:`${new URL(request.url).origin}/checkout/complete`, metadata:JSON.stringify({course_id:record.course_id,user_id:user.id}) }) });
  const result = await response.json() as {status?:boolean;data?:{authorization_url?:string};message?:string};
  if (!response.ok || !result.status || !result.data?.authorization_url) return NextResponse.json({ error:"Unable to start payment" },{status:502});
  return NextResponse.json({ checkoutUrl: result.data.authorization_url, txRef });
}
