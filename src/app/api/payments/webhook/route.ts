import { NextResponse } from "next/server";
import { paymentMatches, verifyPaystackTransaction, verifyWebhookSignature } from "@/lib/payments/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();
  if (!secret || !signature) return NextResponse.json({ error:"Unauthorized" },{status:401});
  const valid = verifyWebhookSignature(rawBody, signature, secret);
  if (!valid) return NextResponse.json({ error:"Invalid signature" },{status:401});
  const event = JSON.parse(rawBody) as { event?:string; data?: { id?: number; reference?:string } };
  if (["transfer.success","transfer.failed","transfer.reversed"].includes(event.event || "")) {
    const transfer = event.data as { transfer_code?:string; reference?:string } | undefined;
    if (!transfer?.transfer_code) return NextResponse.json({error:"Invalid transfer event"},{status:400});
    const admin=createAdminClient();
    const payoutStatus=event.event==="transfer.success"?"paid":"rejected";
    const {error}=await admin.from("payouts").update({status:payoutStatus,processed_at:new Date().toISOString(),rejection_reason:payoutStatus==="rejected"?event.event:null}).eq("provider_transfer_id",transfer.transfer_code);
    if(error)return NextResponse.json({error:"Payout update failed"},{status:500});
    return NextResponse.json({received:true});
  }
  if (event.event !== "charge.success" || !event.data?.reference) return NextResponse.json({received:true});
  const verified=await verifyPaystackTransaction(event.data.reference,secret);
  if(!verified)return NextResponse.json({error:"Verification failed"},{status:502});
  const admin=createAdminClient();const {data:expected}=await admin.from("payments").select("amount_minor,currency,tx_ref").eq("tx_ref",verified.reference).single();
  if(!expected||!paymentMatches(verified,{amountMinor:expected.amount_minor,currency:expected.currency,txRef:expected.tx_ref}))return NextResponse.json({error:"Transaction mismatch"},{status:400});
  const {error}=await admin.rpc("finalize_verified_payment",{p_provider_event_id:`transaction:${verified.id}`,p_provider_transaction_id:String(verified.id),p_tx_ref:verified.reference,p_amount_minor:expected.amount_minor,p_currency:expected.currency,p_verified_payload:{event,verified}});
  if(error)return NextResponse.json({error:"Finalization failed"},{status:500});
  return NextResponse.json({received:true});
}
