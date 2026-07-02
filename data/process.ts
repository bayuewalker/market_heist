export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

export const processSteps: ProcessStep[] = [
  {
    step: "A",
    title: "Input",
    description: "Ask for any pair market recommendation you need.",
  },
  {
    step: "B",
    title: "Process & Analyze",
    description: "Our AI analyzes the request with S.A.I capabilities.",
  },
  {
    step: "C",
    title: "Output",
    description: "Receive a high-accuracy signal using the FIBOLUTION technique.",
  },
];
