import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/flutterwave";
import { paymentMatches } from "@/lib/payments/flutterwave";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  const signature = request.headers.get("flutterwave-signature");
  const rawBody = await request.text();
  if (!secret || !signature) return NextResponse.json({ error:"Unauthorized" },{status:401});
  const valid = verifyWebhookSignature(rawBody, signature, secret);
  if (!valid) return NextResponse.json({ error:"Invalid signature" },{status:401});
  const event = JSON.parse(rawBody) as { id?:string; data?: { id?: number } };
  if (!event.data?.id) return NextResponse.json({ error:"Invalid event" },{status:400});
  const flutterwaveSecret=process.env.FLUTTERWAVE_SECRET_KEY;if(!flutterwaveSecret)return NextResponse.json({error:"Payments are not configured"},{status:503});
  const verifyResponse=await fetch(`https://api.flutterwave.com/v3/transactions/${event.data.id}/verify`,{headers:{Authorization:`Bearer ${flutterwaveSecret}`},cache:"no-store"});
  if(!verifyResponse.ok)return NextResponse.json({error:"Verification failed"},{status:502});
  const verified=await verifyResponse.json() as {data?:{id:number;status:string;amount:number;currency:string;tx_ref:string}};
  if(!verified.data)return NextResponse.json({error:"Invalid verification response"},{status:502});
  const admin=createAdminClient();const {data:expected}=await admin.from("payments").select("amount_minor,currency,tx_ref").eq("tx_ref",verified.data.tx_ref).single();
  if(!expected||!paymentMatches(verified.data,{amountMinor:expected.amount_minor,currency:expected.currency,txRef:expected.tx_ref}))return NextResponse.json({error:"Transaction mismatch"},{status:400});
  const {error}=await admin.rpc("finalize_verified_payment",{p_provider_event_id:event.id||String(event.data.id),p_provider_transaction_id:String(verified.data.id),p_tx_ref:verified.data.tx_ref,p_amount_minor:expected.amount_minor,p_currency:expected.currency,p_verified_payload:verified});
  if(error)return NextResponse.json({error:"Finalization failed"},{status:500});
  return NextResponse.json({received:true});
}
