import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 md:grid-cols-[1fr_auto]">
        <div>
          <Logo />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-2">
            Facet estimates diamond prices with a neural network trained on diamond characteristics. Results are statistical estimates in
            Indian rupees. They are not a certified appraisal or an offer to buy or sell.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-2">
          <a href="#valuation" className="hover:text-ink">Valuation</a>
          <a href="#model" className="hover:text-ink">Model</a>
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <a href="#technology" className="hover:text-ink">Technology</a>
        </nav>
      </div>
    </footer>
  );
}
