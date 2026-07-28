import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentMatches, verifyPaystackTransaction } from "@/lib/payments/paystack";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const destination = new URL("/dashboard/learner/my-learning", url.origin);
  if (!reference || !secret) {
    destination.searchParams.set("payment", "pending");
    return NextResponse.redirect(destination);
  }
  const verified = await verifyPaystackTransaction(reference, secret);
  const admin = createAdminClient();
  const { data: expected } = await admin.from("payments").select("amount_minor,currency,tx_ref").eq("tx_ref", reference).maybeSingle();
  if (!verified || !expected || !paymentMatches(verified, { amountMinor: expected.amount_minor, currency: expected.currency, txRef: expected.tx_ref })) {
    destination.searchParams.set("payment", "pending");
    return NextResponse.redirect(destination);
  }
  const { error } = await admin.rpc("finalize_verified_payment", { p_provider_event_id:`transaction:${verified.id}`, p_provider_transaction_id:String(verified.id), p_tx_ref:verified.reference, p_amount_minor:expected.amount_minor, p_currency:expected.currency, p_verified_payload:{source:"callback",verified} });
  destination.searchParams.set("payment", error ? "pending" : "successful");
  return NextResponse.redirect(destination);
}
