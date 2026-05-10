"use client";

import { useState } from "react";

const QUESTIONS = [
  {
    q: "What happens at the end of my trial?",
    a: "Your account moves to the Free plan automatically — no charges, no surprises. You keep everything you saved. Upgrade when you're ready.",
  },
  {
    q: "Can I use Recipup for more than one dog?",
    a: "Yes. You can add multiple dogs and build separate recipe plans for each. Every profile is independent.",
  },
  {
    q: "Is Recipup suitable for puppies and senior dogs?",
    a: "Yes — Recipup adjusts calorie targets and nutrition guidelines for all life stages, from puppies through to seniors. Just tell us your dog's age and we handle the rest.",
  },
  {
    q: "Do I need to be a confident cook?",
    a: "Not at all. Recipup gives you clear, step-by-step instructions built around your cooking equipment and how often you want to cook. If you can boil water, you can follow a Recipup recipe.",
  },
  {
    q: "Is it safe for dogs with health conditions?",
    a: "Recipup applies specific nutritional rules for kidney disease, diabetes, heart conditions, joint issues, and more. We always recommend checking with your vet for medical conditions — we flag recipes that warrant a conversation.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time. There are no long-term commitments. If you cancel, you keep access until the end of your billing period, then move to the Free plan.",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {QUESTIONS.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 py-5 text-left"
          >
            <span className="font-semibold text-[var(--color-ink)]">{item.q}</span>
            <span className="shrink-0 text-lg font-light text-[var(--color-coral)]">
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && (
            <p className="pb-5 text-base text-[var(--color-ink-soft)]">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
