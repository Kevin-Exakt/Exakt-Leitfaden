"use client";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

/** Große, mit dem Daumen gut treffbare Checkbox-Zeile. */
export function CheckItem({
  an,
  onUmschalten,
  children,
  zusatz,
  pflicht = true,
  ton = "neutral",
}: {
  an: boolean;
  onUmschalten: () => void;
  children: ReactNode;
  zusatz?: ReactNode;
  pflicht?: boolean;
  ton?: "neutral" | "sicherheit";
}) {
  const rahmen = an
    ? "border-ok bg-ok-hell"
    : ton === "sicherheit"
      ? "border-red-200 bg-karte"
      : "border-rand bg-karte";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={an}
      onClick={onUmschalten}
      className={`flex w-full min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${rahmen}`}
    >
      <span
        aria-hidden
        className={`flex size-7 shrink-0 items-center justify-center rounded-md border-2 ${
          an ? "border-ok bg-ok text-white" : "border-slate-400 bg-white"
        }`}
      >
        {an && <Check className="size-5" strokeWidth={3} />}
      </span>
      <span className="flex-1">
        <span className="block font-medium">{children}</span>
        {zusatz && <span className="block text-sm text-text-leise">{zusatz}</span>}
      </span>
      {!pflicht && <span className="text-xs text-text-leise">optional</span>}
    </button>
  );
}
