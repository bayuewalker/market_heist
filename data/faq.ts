export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "What is Market Heist AI?",
    answer:
      "Market Heist AI is a tactical AI analyst and assistant for traders. It reads market signals, runs structured analysis on the pairs you ask about, and returns a signal and strategy so you can make a more informed call.",
  },
  {
    question: "What is a “Market Heister”? What are the benefits?",
    answer:
      "A Market Heister is a member of the Market Heist community. Members get access to AI-generated signals, live trade sessions, mentoring, and a crew of traders working the markets together instead of alone.",
  },
  {
    question: "Can I try it for free first?",
    answer:
      "Yes. The Basic plan is free and includes daily trend updates, three signal pair recommendations, and a weekly live trade session so you can see how Market Heist works before upgrading.",
  },
  {
    question: "What if I'm still confused and can't use the signals?",
    answer:
      "Every plan includes live trade sessions and mentoring. Pro and Elite members get these every weekday, so you can ask questions and walk through signals directly with the team.",
  },
  {
    question: "Which markets are supported?",
    answer:
      "Market Heist AI covers crypto, forex, and commodity markets. Basic includes a limited set of pairs, while Pro and Elite unlock broader and, eventually, unlimited pair coverage.",
  },
  {
    question: "How can I contact support?",
    answer:
      "Reach the team any time at Info@marketheist.com. We're happy to help with account questions, signal questions, or anything else about being a Market Heister.",
  },
];
