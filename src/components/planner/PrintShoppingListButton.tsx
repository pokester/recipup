"use client";

export function PrintShoppingListButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-[var(--color-ink-300)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)]"
    >
      Print list
    </button>
  );
}
