import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GoogleAuthButton } from "@/components/account/GoogleAuthButton";
import { useVerticalSectionPager } from "@/hooks/use-vertical-section-pager";
import { RotatingHeadline } from "./RotatingHeadline";
import { TransformationSection } from "./TransformationSection";

const SECTION_COUNT = 4;

export function LandingPage() {
  const [transformationComplete, setTransformationComplete] = useState(false);
  const canNavigate = useCallback(
    (fromIndex: number, toIndex: number) =>
      !(fromIndex === 1 && toIndex === 2 && !transformationComplete),
    [transformationComplete],
  );
  const pager = useVerticalSectionPager(SECTION_COUNT, canNavigate);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black font-sans text-white">
      <header
        className="absolute inset-x-0 top-0 z-50 flex items-end border-b border-white/8 bg-[#070707] px-4 pb-2.5"
        style={{ height: "calc(2.75rem + env(safe-area-inset-top))" }}
      >
        <span className="text-sm font-semibold tracking-[-0.02em] text-white">No More Copium</span>
      </header>

      <main
        ref={pager.viewportRef}
        {...pager.interactionProps}
        className="absolute inset-x-0 bottom-0 overflow-hidden bg-black text-white outline-none touch-none overscroll-none"
        style={{ top: "calc(2.75rem + env(safe-area-inset-top))" }}
        tabIndex={0}
        aria-label={`No More Copium landing page, section ${pager.index + 1} of ${SECTION_COUNT}`}
      >
        <div ref={pager.trackRef} className="h-full will-change-transform">
          <HeroSection active={pager.index === 0} onContinue={() => pager.goTo(1)} />
          <TransformationSection
            active={pager.index === 1}
            onTransformed={() => setTransformationComplete(true)}
            onContinue={() => pager.goTo(2)}
          />
          <HandsSection active={pager.index === 2} onContinue={() => pager.goTo(3)} />
          <ValueSection active={pager.index === 3} />
        </div>
      </main>
    </div>
  );
}

function HeroSection({ active, onContinue }: { active: boolean; onContinue: () => void }) {
  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-black" aria-hidden={!active}>
      <div
        className="absolute inset-x-0 top-0 h-[62%] bg-white"
        aria-label="Hero image placeholder"
      />
      <div className="pointer-events-none absolute inset-x-0 top-[37%] h-[40%] bg-gradient-to-b from-transparent via-black/75 to-black" />

      <div className="absolute inset-x-0 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] z-[1] px-5">
        <div className="landing-display text-[clamp(2.15rem,10vw,5.25rem)] font-semibold leading-[0.96] tracking-[-0.045em] text-white">
          <RotatingHeadline />
        </div>
        <p className="mt-2 text-center text-[clamp(1rem,4.5vw,1.4rem)] font-medium tracking-[-0.02em] text-white/78">
          All with <span className="text-red-500">No More Copium</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        tabIndex={active ? 0 : -1}
        className="group absolute inset-x-0 bottom-[calc(0.8rem+env(safe-area-inset-bottom))] z-[2] mx-auto flex w-fit flex-col items-center gap-0.5 rounded-full px-5 py-1.5 text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:scale-[0.97]"
        aria-label="Continue to the next section"
      >
        <ChevronDown className="landing-swipe-chevron h-5 w-5" aria-hidden="true" />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em]">Swipe down</span>
      </button>
    </section>
  );
}

function HandsSection({ active, onContinue }: { active: boolean; onContinue: () => void }) {
  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-black" aria-hidden={!active}>
      <div className="absolute inset-x-0 top-0 h-[64%] overflow-hidden bg-black">
        <img
          src="/landing/hands-comparison.webp"
          alt="Before and after comparison of hand and wrist development"
          loading="eager"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[41%] h-[34%] bg-gradient-to-b from-transparent via-black/80 to-black" />

      <div className="absolute inset-x-0 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] px-6 text-center">
        <blockquote className="mx-auto max-w-2xl text-[clamp(1.85rem,8.5vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-white">
          “You can&apos;t naturally thicken wrist and hands.”
        </blockquote>
        <p className="mt-5 text-[clamp(1rem,4.5vw,1.35rem)] font-semibold tracking-[-0.02em] text-red-500">
          JFL, look at this.
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        tabIndex={active ? 0 : -1}
        className="absolute inset-x-0 bottom-[calc(0.8rem+env(safe-area-inset-bottom))] z-[2] mx-auto flex w-fit flex-col items-center gap-0.5 rounded-full px-5 py-1.5 text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:scale-[0.97]"
        aria-label="Continue to the final section"
      >
        <ChevronDown className="landing-swipe-chevron h-5 w-5" aria-hidden="true" />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em]">Swipe down</span>
      </button>
    </section>
  );
}

const VALUE_ITEMS = [
  {
    lead: "No AIslop",
    body: "Handmade personalized training program unique to You.",
  },
  {
    lead: "1-1 Access to Dethnic",
    body: "I'll even modify your training program as you go. I'll even personally support you as you go.",
  },
  {
    lead: "Beginner? Struggling to stay consistent?",
    body: "The app is built to slowly build up your consistency, no matter where you are. We'll build your new lifestyle together, brick by brick.",
  },
  {
    lead: "Growth Plates Closed?",
    body: "This method is built to work at any age.",
  },
  { lead: "Best Progress Tracking", body: "" },
  { lead: "Guided Workouts", body: "" },
] as const;

function ValueSection({ active }: { active: boolean }) {
  return (
    <section
      className="landing-value-section flex h-full min-h-0 items-center bg-[#080808] px-5"
      aria-hidden={!active}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col">
        <h2 className="text-[clamp(2rem,9vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
          All this for just <span className="text-red-500">$29/month</span>
        </h2>

        <ul className="landing-value-list mt-[clamp(1.1rem,3dvh,2rem)] space-y-[clamp(0.45rem,1.4dvh,0.85rem)]">
          {VALUE_ITEMS.map((item) => (
            <li
              key={item.lead}
              className="flex gap-2.5 text-[clamp(0.72rem,1.7dvh,0.9rem)] leading-[1.38] text-white/62"
            >
              <span
                className="mt-[0.48em] h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                aria-hidden="true"
              />
              <p>
                <span className="text-red-500">{item.lead}</span>
                {item.body && <span> {item.body}</span>}
              </p>
            </li>
          ))}
        </ul>

        <GoogleAuthButton tabIndex={active ? 0 : -1} className="mt-[clamp(1.2rem,3dvh,2.2rem)]" />
      </div>
    </section>
  );
}
