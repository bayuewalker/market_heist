import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Market Heist AI.",
};

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p>Last updated: July 2026</p>

      <p>
        This policy explains what Market Heist AI collects and how we use it. By using the service,
        you agree to this policy.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your email and name.</li>
        <li><strong>Usage data</strong> — signals you request and generate, and basic app activity.</li>
        <li><strong>Payment data</strong> — membership orders and on-chain transaction references (we do not take custody of your wallet or private keys).</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the service (authentication, generating signals, managing memberships).</li>
        <li>To operate, secure, and improve the product.</li>
        <li>To communicate with you about your account.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We rely on trusted third parties to run the service, including:</p>
      <ul>
        <li><strong>Supabase</strong> — authentication and database.</li>
        <li><strong>NVIDIA</strong> — AI model used to generate signals (your request text is sent to generate a response).</li>
        <li><strong>Vercel</strong> — hosting.</li>
        <li><strong>TronGrid</strong> — reading public on-chain payment data.</li>
      </ul>

      <h2>Cookies</h2>
      <p>We use essential cookies to keep you signed in. We do not use them for advertising.</p>

      <h2>Retention</h2>
      <p>
        We keep your data for as long as your account is active or as needed to provide the service
        and meet legal obligations.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request access to or deletion of your account data by contacting us. Some records
        (like on-chain transactions) are public and cannot be deleted.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:Info@marketheist.com">Info@marketheist.com</a>
      </p>
    </article>
  );
}
