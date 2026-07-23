import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Phase = "before" | "transforming" | "after";

export function TransformationSection({
  active,
  onTransformed,
  onContinue,
}: {
  active: boolean;
  onTransformed: () => void;
  onContinue: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("before");
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const transform = () => {
    if (phase !== "before") return;
    setPhase("transforming");
    const transitionMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
    timerRef.current = window.setTimeout(() => {
      setPhase("after");
      onTransformed();
      timerRef.current = null;
    }, transitionMs);
  };

  const afterVisible = phase !== "before";

  return (
    <section
      className="landing-transformation-section relative h-full min-h-0 overflow-hidden bg-black"
      aria-hidden={!active}
    >
      <div className="absolute inset-x-0 top-0 h-[61%] overflow-hidden bg-[#0b0b0b]">
        <img
          src="/landing/transformation-before.webp"
          alt="Physique before the transformation"
          draggable={false}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-[opacity,transform] duration-500 ease-out ${
            afterVisible ? "scale-[0.985] opacity-0" : "scale-100 opacity-100"
          }`}
        />
        <img
          src="/landing/transformation-after.webp"
          alt="Physique three months after the transformation"
          draggable={false}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-[opacity,transform] duration-500 ease-out ${
            afterVisible ? "scale-100 opacity-100" : "scale-[1.025] opacity-0"
          }`}
        />
        {phase === "transforming" && (
          <div className="landing-transform-wipe pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-red-500/65 to-transparent blur-sm" />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[38%] h-[34%] bg-gradient-to-b from-transparent via-black/75 to-black" />

      <div className="absolute inset-x-0 bottom-[calc(1.2rem+env(safe-area-inset-bottom))] z-[2] px-5">
        <div className="mx-auto max-w-md" aria-live="polite">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-500">
            {phase === "after" ? "Three months later (all natural)" : "Before"}
          </p>

          <ul
            className={`mt-3 space-y-1.5 transition-[opacity,transform] duration-500 ease-out ${
              phase === "transforming" ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            }`}
          >
            {(phase === "after"
              ? ["5 foot 10", "Happiness begins"]
              : ["5 foot 5", "Depressed", "Lonely", "Manlet"]
            ).map((stat) => (
              <li
                key={stat}
                className="flex items-center gap-3 text-[clamp(1.1rem,5vw,1.45rem)] font-medium tracking-[-0.025em] text-white"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                {stat}
              </li>
            ))}
          </ul>

          {phase !== "after" ? (
            <button
              type="button"
              onClick={transform}
              disabled={phase === "transforming"}
              tabIndex={active ? 0 : -1}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-70"
            >
              {phase === "transforming" ? "Transforming…" : "Transform"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              tabIndex={active ? 0 : -1}
              className="landing-after-swipe mt-4 flex w-full flex-col items-center gap-0.5 rounded-full py-1.5 text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:scale-[0.98]"
              aria-label="Continue to the next section"
            >
              <ChevronDown className="landing-swipe-chevron h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
                Swipe down
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
