import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(rawBody:string, signature:string, secret:string){
  const expected=createHmac("sha256",secret).update(rawBody).digest("base64");
  return expected.length===signature.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(signature));
}

export function paymentMatches(input:{status:string;amount:number;currency:string;tx_ref:string},expected:{amountMinor:number;currency:string;txRef:string}){
  return input.status==="successful"&&Math.round(input.amount*100)===expected.amountMinor&&input.currency===expected.currency&&input.tx_ref===expected.txRef;
}
