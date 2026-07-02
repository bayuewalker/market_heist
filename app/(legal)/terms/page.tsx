import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Market Heist AI.",
};

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p>Last updated: July 2026</p>

      <p>
        These Terms govern your use of Market Heist AI (&ldquo;Market Heist&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;). By creating an account or using the service, you agree to these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old and legally able to enter into these Terms. You are
        responsible for complying with the laws that apply to you.
      </p>

      <h2>2. The service</h2>
      <p>
        Market Heist provides AI-generated, <strong>educational</strong> market analysis, signals,
        and related community features. It does not provide financial, investment, legal, or tax
        advice. See our <a href="/risk">Risk Disclaimer</a>.
      </p>

      <h2>3. Memberships &amp; payments</h2>
      <ul>
        <li>Paid plans are billed in crypto (USDT) on a <strong>pay-per-period</strong> basis (e.g. monthly or annual). There is no automatic renewal.</li>
        <li>Access is granted for the period purchased and automatically reverts to the free tier when it expires.</li>
        <li>Because payments settle on-chain, they are generally <strong>non-refundable</strong> once confirmed.</li>
        <li>You are responsible for sending the exact amount and network specified. We are not liable for transfers to the wrong address, network, or amount.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Don&rsquo;t misuse, overload, reverse-engineer, or attempt to circumvent limits or security of the service.</li>
        <li>Don&rsquo;t use the service for unlawful purposes or to harm others.</li>
        <li>Your account is for you; keep your credentials secure.</li>
      </ul>

      <h2>5. No advice; no warranty</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
        guarantee accuracy, availability, or any trading outcome.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Market Heist is not liable for any trading losses or
        for any indirect, incidental, or consequential damages arising from your use of the service.
      </p>

      <h2>7. Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these Terms. You may stop using the service
        at any time.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms; continued use after changes means you accept them.
      </p>

      <h2>9. Contact</h2>
      <p>
        <a href="mailto:Info@marketheist.com">Info@marketheist.com</a>
      </p>
    </article>
  );
}
