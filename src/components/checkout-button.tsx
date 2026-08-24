"use client";
import {useState} from "react";

export function CheckoutButton({courseId,affiliateCode,variant="default"}:{courseId:string;affiliateCode?:string;variant?:"default"|"explore"}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function checkout(){
    setBusy(true);
    setError("");
    try{
      const response=await fetch("/api/payments/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId,affiliateCode})});
      const result=await response.json() as {checkoutUrl?:string;error?:string};
      if(!response.ok||!result.checkoutUrl)throw new Error(result.error||"Unable to begin checkout");
      window.location.assign(result.checkoutUrl);
    }catch(reason){
      setError(reason instanceof Error?reason.message:"Unable to begin checkout");
      setBusy(false);
    }
  }
  if(variant==="explore")return <div className="enrol-checkout">
    <button className="enrol-button" type="button" onClick={checkout} disabled={busy} aria-busy={busy}>
      <span className="enrol-button-icon" aria-hidden="true">{busy?<i className="enrol-spinner"/>:"↗"}</span>
      <span className="enrol-button-copy"><b>{busy?"Preparing checkout…":"Enrol in this course"}</b><small>{busy?"Connecting you securely to Paystack":"Secure payment · Instant access"}</small></span>
      <span className="enrol-button-arrow" aria-hidden="true">{busy?"":"→"}</span>
    </button>
    {error&&<small className="enrol-error" role="alert">{error} Please try again.</small>}
  </div>;
  return <div><button className="text-link" type="button" onClick={checkout} disabled={busy} aria-busy={busy}>{busy?"Starting checkout…":"Enroll →"}</button>{error&&<small className="form-error" role="alert">{error}</small>}</div>;
}
