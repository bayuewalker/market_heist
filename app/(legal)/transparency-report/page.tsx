import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transparency Report",
  description: "Monthly public report on signals, rewards, users, and product updates.",
};

export default function TransparencyReportPage() {
  return (
    <article>
      <h1>Transparency Report</h1>
      <p>Last updated: July 2026</p>

      <p>
        Market Heist AI publishes a monthly transparency report covering signal performance, reward
        payouts, community growth, and product updates. We&rsquo;re building toward MVP V1 launch — the
        first report will be published after our first full month of live activity.
      </p>

      <h2>What each report will cover</h2>
      <ul>
        <li>Signal outcomes — how many signals hit target vs. were invalidated, by market.</li>
        <li>Reward activity — total rewards approved and paid, by allocation type.</li>
        <li>Community growth — new members, verified members, and Captain Network activity.</li>
        <li>Product updates — what shipped, what changed, what&rsquo;s next.</li>
      </ul>

      <p>
        In the meantime, live figures are always available on the public{" "}
        <a href="/donation-ledger">Donation Ledger</a>, and on the Leaderboard for signed-in members.
      </p>

      <p>
        Questions? Contact us at{" "}
        <a href="mailto:Info@marketheist.com">Info@marketheist.com</a>.
      </p>
    </article>
  );
}
