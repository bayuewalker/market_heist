import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Data Consent",
  description: "How Mentor Heister uses your data to generate AI responses.",
};

export default function AiDataConsentPage() {
  return (
    <article>
      <h1>AI Data Consent</h1>
      <p>Last updated: July 2026</p>

      <p>
        Before using Mentor Heister (our AI trading mentor), you&rsquo;re asked to acknowledge how your
        data is used to generate responses. This page is the full breakdown behind that consent step.
      </p>

      <h2>What data Mentor uses</h2>
      <ul>
        <li><strong>Your questions and Mentor&rsquo;s answers</strong> are sent to our AI provider to generate a response.</li>
        <li><strong>Journal data</strong> you log may be summarized for trade-review and journal-summary answers.</li>
        <li><strong>Broker activity data</strong> (your verified status) may inform broker-route suggestions.</li>
        <li><strong>Reward data</strong> (points, rank, reward history) may be included in a prompt so Mentor can give context-aware answers.</li>
      </ul>

      <h2>How it&rsquo;s used</h2>
      <ul>
        <li>Data is sent to a third-party AI provider solely to generate the response you requested — it is not used to train the provider&rsquo;s models.</li>
        <li>Mentor&rsquo;s answers are educational information, not financial advice — see our <a href="/risk">Risk Disclaimer</a>.</li>
        <li>Conversations are logged so you can see your own chat history and so we can monitor for abuse and improve the product.</li>
      </ul>

      <h2>Your control</h2>
      <ul>
        <li>You can stop using Mentor at any time — simply don&rsquo;t send it any more messages.</li>
        <li>Consent is recorded once per account and applies to all Mentor functions (chat, position sizing, bot templates, trade review).</li>
        <li>To request deletion of your account data, contact us below.</li>
      </ul>

      <p>
        For how we handle your data more broadly, see our <a href="/privacy">Privacy Policy</a>.
        Questions? Contact us at{" "}
        <a href="mailto:Info@marketheist.com">Info@marketheist.com</a>.
      </p>
    </article>
  );
}
