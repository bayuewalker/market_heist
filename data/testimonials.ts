export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initials: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Yusuf R",
    role: "Market Heister Basic",
    quote:
      "The daily trend updates alone changed how I plan my week. Even on the free plan I finally feel like I understand what I'm looking at before I take a position.",
    initials: "YR",
  },
  {
    name: "Roni Lureman",
    role: "Market Heist Pro",
    quote:
      "Ten signal pairs a day and live mentoring on weekdays is a different level of support. The FIBOLUTION breakdowns help me understand the why, not just the what.",
    initials: "RL",
  },
  {
    name: "Dian Kartika",
    role: "Market Heist Pro",
    quote:
      "Being part of a crew of Market Heisters keeps me accountable. The live sessions feel like a trading desk, not a course I forgot to finish.",
    initials: "DK",
  },
];
