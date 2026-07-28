"use client";

import { useActionState } from "react";
import { configurePayoutAccount, requestWalletPayout, type WalletActionState } from "@/app/dashboard/actions";

const initial: WalletActionState = {};
function Feedback({state}:{state:WalletActionState}) { return state.error ? <small className="form-error" role="alert">{state.error}</small> : state.success ? <small className="form-success" role="status">{state.success}</small> : null; }

export function BankAccountForm({banks}:{banks:{name:string;code:string}[]}) {
  const [state, action, pending] = useActionState(configurePayoutAccount, initial);
  return <form action={action} className="crud-form">
    <label>Bank<select name="bank_code" required defaultValue=""><option value="" disabled>Select your bank</option>{banks.map(bank=><option value={bank.code} key={`${bank.code}-${bank.name}`}>{bank.name}</option>)}</select></label>
    <label>Account number<input name="account_number" inputMode="numeric" autoComplete="off" pattern="[0-9]{10}" minLength={10} maxLength={10} required placeholder="10-digit account number" /></label>
    <p className="wallet-security-note">Your account number is sent securely to Paystack for verification and is not stored by Mahadum.</p>
    <button className="button" disabled={pending || banks.length===0}>{pending?"Verifying account…":"Verify payout account"}</button><Feedback state={state}/>
  </form>;
}

export function PayoutRequestForm({available}:{available:number}) {
  const [state, action, pending] = useActionState(requestWalletPayout, initial);
  return <form action={action} className="crud-form"><label>Amount (NGN)<input name="amount" type="number" min="10000" step="100" max={Math.floor(available/100)} required placeholder="10,000" /></label><button className="button" disabled={pending || available<1000000}>{pending?"Submitting request…":"Request payout"}</button>{available<1000000?<small className="wallet-note">Your settled balance must reach ₦10,000.</small>:null}<Feedback state={state}/></form>;
}
