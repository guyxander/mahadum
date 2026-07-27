import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/flutterwave";

export async function POST(request: Request) {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  const signature = request.headers.get("flutterwave-signature");
  const rawBody = await request.text();
  if (!secret || !signature) return NextResponse.json({ error:"Unauthorized" },{status:401});
  const valid = verifyWebhookSignature(rawBody, signature, secret);
  if (!valid) return NextResponse.json({ error:"Invalid signature" },{status:401});
  const event = JSON.parse(rawBody) as { data?: { id?: number } };
  if (!event.data?.id) return NextResponse.json({ error:"Invalid event" },{status:400});
  // A configured deployment must verify status, amount, currency and tx_ref with Flutterwave,
  // then atomically upsert the payment and enrollment. Duplicate event IDs remain idempotent.
  return NextResponse.json({ received:true });
}
