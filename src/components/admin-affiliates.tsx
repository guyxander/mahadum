import type { Row } from "@/lib/dashboard";
import { moderateAffiliate, updateAffiliateCommissions } from "@/app/dashboard/actions";

const text = (value: unknown) => typeof value === "string" ? value : "";
const number = (value: unknown) => typeof value === "number" ? value : 0;
const profile = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};

export function AdminAffiliates({ affiliates }: { affiliates: Row[] }) {
  const approved = affiliates.filter((affiliate) => affiliate.status === "approved").length;
  return <div className="dashboard-page admin-affiliates-page">
    <div className="page-head"><div><span className="overline">Affiliate network</span><h1>Affiliates</h1><p>Manage membership and commission rates for every affiliate.</p></div></div>
    <div className="affiliate-admin-metrics">
      <article><span>Total affiliates</span><strong>{affiliates.length}</strong></article>
      <article><span>Approved</span><strong>{approved}</strong></article>
      <article><span>Other statuses</span><strong>{affiliates.length - approved}</strong></article>
    </div>
    {affiliates.length === 0 ? <section className="panel empty-state"><b>No affiliates yet</b><p>New Mahadum accounts will appear here automatically.</p></section> : <div className="admin-affiliate-list">
      {affiliates.map((affiliate) => {
        const id = text(affiliate.user_id);
        const name = text(profile(affiliate.profiles).full_name) || "Mahadum member";
        const code = text(affiliate.code);
        const status = text(affiliate.status) || "pending";
        return <article className="admin-affiliate-card" key={id}>
          <header>
            <span className="user-avatar">{name.slice(0, 2).toUpperCase()}</span>
            <div><h2>{name}</h2><p>Referral code <b>{code}</b></p></div>
            <span className={`status ${status}`}>{status}</span>
          </header>
          <div className="affiliate-current-split"><span>Level one <b>{number(affiliate.level_one_bps) / 100}%</b></span><span>Level two <b>{number(affiliate.level_two_bps) / 100}%</b></span></div>
          <form action={updateAffiliateCommissions} className="affiliate-rate-form">
            <input type="hidden" name="id" value={id} />
            <label>Level-one commission (%)<input name="level_one_percent" type="number" min="0" max="30" step="0.01" defaultValue={number(affiliate.level_one_bps) / 100} required /></label>
            <label>Level-two commission (%)<input name="level_two_percent" type="number" min="0" max="30" step="0.01" defaultValue={number(affiliate.level_two_bps) / 100} required /></label>
            <button className="button" type="submit">Save commissions</button>
          </form>
          {status === "pending" && <div className="affiliate-moderation"><form action={moderateAffiliate}><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value="approved"/><button className="outline-button">Approve</button></form><form action={moderateAffiliate}><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value="rejected"/><button className="outline-button danger">Reject</button></form></div>}
        </article>;
      })}
    </div>}
  </div>;
}
