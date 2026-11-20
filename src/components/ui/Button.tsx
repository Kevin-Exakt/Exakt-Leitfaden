import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariante = "primaer" | "sekundaer" | "ja" | "nein" | "neutral" | "gefahr" | "leise";

const STIL: Record<ButtonVariante, string> = {
  primaer: "bg-akzent text-tinte hover:bg-akzent-hover border-akzent-hover/40",
  sekundaer: "bg-karte text-text hover:bg-flaeche border-rand",
  ja: "bg-ok text-white hover:bg-green-800 border-transparent",
  nein: "bg-sicherheit text-white hover:bg-red-800 border-transparent",
  neutral: "bg-karte text-text hover:bg-flaeche border-slate-300",
  gefahr: "bg-karte text-sicherheit hover:bg-sicherheit-hell border-red-200",
  leise: "bg-transparent text-text-leise hover:text-text hover:bg-slate-100 border-transparent",
};

const BASIS =
  "inline-flex items-center justify-center gap-2 rounded-xl border px-4 font-semibold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[inherit] select-none";

type Gemeinsam = { variante?: ButtonVariante; gross?: boolean; breit?: boolean; icon?: ReactNode };

function klassen({ variante = "sekundaer", gross = true, breit = false }: Gemeinsam, extra?: string) {
  return [BASIS, STIL[variante], gross ? "min-h-14 text-lg" : "min-h-11 text-base", breit ? "w-full" : "", extra ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Button({ variante, gross, breit, icon, className, children, ...rest }: Gemeinsam & ComponentProps<"button">) {
  return (
    <button type="button" className={klassen({ variante, gross, breit }, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variante, gross, breit, icon, className, children, ...rest }: Gemeinsam & ComponentProps<typeof Link>) {
  return (
    <Link className={klassen({ variante, gross, breit }, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function ButtonExtern({ variante, gross, breit, icon, className, children, ...rest }: Gemeinsam & ComponentProps<"a">) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={klassen({ variante, gross, breit }, className)} {...rest}>
      {icon}
      {children}
    </a>
  );
}
