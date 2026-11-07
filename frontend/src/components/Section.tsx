import type { ReactNode } from "react";

interface Props {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  bordered?: boolean;
}

export function Section({ id, title, intro, children, bordered = true }: Props) {
  return (
    <section id={id} className={`${bordered ? "border-t border-line" : ""} py-20 sm:py-28`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2 className="display max-w-2xl text-[clamp(2rem,4.4vw,3.25rem)] text-ink">{title}</h2>
        {intro && <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-ink-2">{intro}</p>}
        <div className="mt-12 sm:mt-14">{children}</div>
      </div>
    </section>
  );
}
