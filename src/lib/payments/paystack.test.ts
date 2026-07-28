import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { paymentMatches, verifyWebhookSignature } from "./paystack";

describe("Paystack verification", () => {
  it("accepts only the correct HMAC-SHA512 signature", () => {
    const body = '{"event":"charge.success"}';
    const secret = "test-secret";
    const signature = createHmac("sha512", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    const invalid = `${signature.slice(0, -1)}${signature.endsWith("a") ? "b" : "a"}`;
    expect(verifyWebhookSignature(body, invalid, secret)).toBe(false);
  });
  it("requires status, subunit amount, currency, and reference to match", () => {
    expect(paymentMatches({id:42,status:"success",amount:18500,currency:"NGN",reference:"ref-1"},{amountMinor:18500,currency:"NGN",txRef:"ref-1"})).toBe(true);
    expect(paymentMatches({id:42,status:"success",amount:18400,currency:"NGN",reference:"ref-1"},{amountMinor:18500,currency:"NGN",txRef:"ref-1"})).toBe(false);
  });
});
