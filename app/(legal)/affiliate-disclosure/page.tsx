import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "How Market Heist AI's broker partnerships work.",
};

export default function AffiliateDisclosurePage() {
  return (
    <article>
      <h1>Affiliate Disclosure</h1>
      <p>Last updated: July 2026</p>

      <p>
        Market Heist AI partners with third-party brokers. When you open a broker account through a
        referral link on this platform, we may receive a commission from that broker based on your
        trading activity. This is how Market Heist AI funds member rewards and platform operations.
      </p>

      <h2>What this means for you</h2>
      <ul>
        <li>Using a broker referral link does not cost you anything extra — no fee is added to your trades.</li>
        <li>Our recommendations are not personalized financial advice; they reflect brokers we have a partnership with.</li>
        <li>Broker verification (submitting your UID) exists so we can confirm your trading activity and calculate your Verified Broker Reward.</li>
      </ul>

      <h2>What we don&rsquo;t disclose</h2>
      <p>
        We don&rsquo;t publish the exact commission rates we receive from brokers, since those are
        confidential commercial terms between Market Heist AI and each broker. What we do publish is
        how that commission is split — see our{" "}
        <a href="/reward-policy">Reward Policy</a> and <a href="/donation-ledger">Donation Ledger</a>.
      </p>

      <h2>No conflict of interest in signals</h2>
      <p>
        AI-generated signals and trend updates are the same for every member regardless of which
        broker you use or whether you&rsquo;ve submitted a broker UID at all.
      </p>

      <p>
        Questions? Contact us at{" "}
        <a href="mailto:Info@marketheist.com">Info@marketheist.com</a>.
      </p>
    </article>
  );
}
