import { createHmac, timingSafeEqual } from "node:crypto";

export type PaystackTransaction = {
  id: number;
  status: string;
  amount: number;
  currency: string;
  reference: string;
};

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function paymentMatches(input: PaystackTransaction, expected: { amountMinor: number; currency: string; txRef: string }) {
  return input.status === "success" && input.amount === expected.amountMinor && input.currency === expected.currency && input.reference === expected.txRef;
}

export async function verifyPaystackTransaction(reference: string, secret: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const result = await response.json() as { status?: boolean; data?: PaystackTransaction };
  return result.status && result.data ? result.data : null;
}
