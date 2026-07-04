import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reward Policy",
  description: "How Verified Broker Reward and Captain Reward are earned and paid.",
};

export default function RewardPolicyPage() {
  return (
    <article>
      <h1>Reward Policy</h1>
      <p>Last updated: July 2026</p>

      <p>
        Market Heist AI&rsquo;s rewards are a share of trading fees and commission we actually receive
        from our broker partners — not an investment return, not interest, and not a promised payout.
      </p>

      <h2>Verified Broker Reward</h2>
      <ul>
        <li>Submit your broker UID on your dashboard and wait for admin verification.</li>
        <li>Once verified, your reward is calculated as a percentage of your own trading fees for the period, based on your plan tier.</li>
        <li>Reward amounts move through a status lifecycle: estimated → pending → approved → paid.</li>
        <li>Only verified, real trading activity is counted — not signups, referrals, or account creation alone.</li>
      </ul>

      <h2>Captain Reward</h2>
      <ul>
        <li>Captains earn an additional reward on the trading activity of members they&rsquo;ve referred, once those members are verified.</li>
        <li>The reward rate scales with Captain tier (Scout, Captain, Commander, Elite Captain), based on the number of verified members referred.</li>
        <li>Captain Reward is a thank-you for growing the community, not a downstream override of a referred member&rsquo;s own reward.</li>
      </ul>

      <h2>What Reward is not</h2>
      <ul>
        <li>Not MLM, not a multi-level payout structure.</li>
        <li>Not passive income — it requires real, verified trading activity.</li>
        <li>Not an investment return, and not guaranteed.</li>
      </ul>

      <h2>Payment</h2>
      <p>
        Approved rewards are paid on a periodic basis by the Market Heist AI team. Payment timing and
        method may change as the platform grows; any change will be reflected here.
      </p>

      <p>
        Questions about your reward status? Contact us at{" "}
        <a href="mailto:Info@marketheist.com">Info@marketheist.com</a>.
      </p>
    </article>
  );
}
