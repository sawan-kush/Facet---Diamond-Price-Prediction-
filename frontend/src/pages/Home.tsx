import { useState } from "react";
import { DiamondHero } from "../components/DiamondHero";
import { Footer } from "../components/Footer";
import { HowItWorks } from "../components/HowItWorks";
import { ModelAnalytics } from "../components/ModelAnalytics";
import { Navbar } from "../components/Navbar";
import { PredictForm } from "../components/PredictForm";
import { RatePill } from "../components/RateBadge";
import { ResultPanel } from "../components/ResultPanel";
import { Section } from "../components/Section";
import { Technology } from "../components/Technology";
import { usePrediction } from "../hooks/usePrediction";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";

export function Home() {
  const rate = useResource((s) => api.exchangeRate(s));
  const info = useResource((s) => api.modelInfo(s));
  const { state, run, reset } = usePrediction();
  const [focusSignal, setFocusSignal] = useState(0);

  const again = () => {
    reset();
    document.getElementById("valuation")?.scrollIntoView({ behavior: "smooth" });
    setFocusSignal((n) => n + 1);
  };

  return (
    <div id="top">
      <a href="#valuation" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-bg">
        Skip to valuation
      </a>
      <Navbar />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-28 lg:pt-24">
          <div className="lg:col-span-7">
            <h1 className="display text-[clamp(2.9rem,6.6vw,5.4rem)] text-ink">
              Intelligent diamond valuation. Powered by AI.
            </h1>
            <p className="mt-7 max-w-xl text-[1.12rem] leading-relaxed text-ink-2">
              Estimate diamond prices using an advanced neural network trained on diamond characteristics and market data.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#valuation" className="rounded-full bg-ink px-7 py-3.5 text-[0.95rem] font-medium text-bg transition-opacity hover:opacity-85">
                Get started
              </a>
              <a href="#technology" className="rounded-full border border-line-strong px-7 py-3.5 text-[0.95rem] font-medium text-ink transition-colors hover:border-ink">
                Explore technology
              </a>
            </div>
            <div className="mt-10">
              <RatePill rate={rate.data} loading={rate.loading} failed={!!rate.error} />
            </div>
          </div>
          <div className="lg:col-span-5">
            <DiamondHero />
          </div>
        </section>

        <Section
          id="valuation"
          title="Value a diamond"
          intro="Enter the stone’s measurements and grades. The model returns an estimate in Indian rupees, with the exchange rate shown alongside."
        >
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            <PredictForm
              loading={state.status === "loading"}
              serverErrors={state.status === "error" ? state.error.fields : []}
              onSubmit={run}
              focusSignal={focusSignal}
            />
            <ResultPanel state={state} onAgain={again} />
          </div>
        </Section>

        <Section id="model" title="How well the model performs">
          <ModelAnalytics info={info} rate={rate.data} />
        </Section>

        <Section id="how-it-works" title="From measurements to rupees" intro="What happens between pressing Predict price and seeing a number.">
          <HowItWorks />
        </Section>

        <Section id="technology" title="Built to be checked" intro="A React interface over a FastAPI service that runs your trained network. Nothing in the result is precomputed.">
          <Technology info={info.data} />
        </Section>
      </main>
      <Footer />
    </div>
  );
}
