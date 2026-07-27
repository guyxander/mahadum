import { createHmac } from "node:crypto";
import { describe,expect,it } from "vitest";
import { paymentMatches,verifyWebhookSignature } from "./flutterwave";

describe("Flutterwave verification",()=>{
  it("accepts only the correct HMAC signature",()=>{const body='{"id":42}';const secret="test-secret";const signature=createHmac("sha256",secret).update(body).digest("base64");expect(verifyWebhookSignature(body,signature,secret)).toBe(true);expect(verifyWebhookSignature(body,signature.replace(/.$/,"A"),secret)).toBe(false)});
  it("requires status amount currency and reference to match",()=>{expect(paymentMatches({status:"successful",amount:185,currency:"NGN",tx_ref:"ref-1"},{amountMinor:18500,currency:"NGN",txRef:"ref-1"})).toBe(true);expect(paymentMatches({status:"successful",amount:184,currency:"NGN",tx_ref:"ref-1"},{amountMinor:18500,currency:"NGN",txRef:"ref-1"})).toBe(false)});
});
