import { ArrowLeftRight, BadgeIndianRupee, BrainCircuit, Columns3, Scaling, SlidersHorizontal, type LucideIcon } from "lucide-react";

const STEPS: { Icon: LucideIcon; title: string; body: string; detail: string }[] = [
  {
    Icon: SlidersHorizontal,
    title: "You describe the diamond",
    body: "Carat, depth, table, three dimensions, and the cut, color and clarity grades. Every field is checked before it is sent.",
    detail: "carat 1.00 · cut Ideal · color G · clarity VS2 …",
  },
  {
    Icon: Columns3,
    title: "The backend encodes the inputs",
    body: "Grades become one-hot columns exactly as in training, then are aligned to the saved column list so the model sees them in the order it learned.",
    detail: "cut = Ideal → cut_Ideal = 1, other cut_ columns = 0",
  },
  {
    Icon: Scaling,
    title: "Features are scaled",
    body: "The saved StandardScaler standardises all 26 features. It is only ever applied, never refitted on new data.",
    detail: "(value − training mean) ÷ training std",
  },
  {
    Icon: BrainCircuit,
    title: "The neural network predicts",
    body: "A feed-forward network turns the 26 scaled numbers into one scaled price. Dropout is off at inference, so the same stone always gets the same answer.",
    detail: "26 → 256 → 128 → 64 → 1",
  },
  {
    Icon: ArrowLeftRight,
    title: "The price is brought back to real units",
    body: "The target scaler reverses the scaling to give a price in US dollars, the currency the model was trained on, then it is converted to rupees at the current rate.",
    detail: "INR = USD prediction × USD/INR rate",
  },
  {
    Icon: BadgeIndianRupee,
    title: "You see the valuation",
    body: "The rupee figure leads, with the dollar prediction, the exact rate and its source shown beside it so you can check the arithmetic.",
    detail: "₹ in lakh / crore grouping",
  },
];

export function HowItWorks() {
  return (
    <ol className="relative max-w-3xl">
      <span className="absolute bottom-4 left-[1.19rem] top-4 w-px bg-line" aria-hidden="true" />
      {STEPS.map(({ Icon, title, body, detail }, i) => (
        <li key={title} className="relative flex gap-6 pb-10 last:pb-0">
          <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-bg text-ink">
            <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
          </span>
          <div className="pt-1.5">
            <h3 className="text-lg font-medium text-ink">
              <span className="mr-2 text-ink-2 tnum">{i + 1}.</span>
              {title}
            </h3>
            <p className="mt-2 max-w-xl leading-relaxed text-ink-2">{body}</p>
            <code className="mt-3 inline-block rounded-md bg-surface-2 px-2.5 py-1 text-[0.8rem] text-ink">{detail}</code>
          </div>
        </li>
      ))}
    </ol>
  );
}
