"use client";
import { ChevronRight, History } from "lucide-react";
import Link from "next/link";
import { schrittInfo } from "@/src/einsatz/einsatz";
import { useEinsatz } from "@/src/einsatz/speicher";

/** Zeigt auf der Startseite „Leitfaden fortsetzen“, falls auf diesem Gerät einer läuft. */
export function LaufenderEinsatz({ auftraggeber, namen }: { auftraggeber: string; namen: Record<string, string> }) {
  const [einsatz] = useEinsatz();
  if (!einsatz || einsatz.pfad.auftraggeber !== auftraggeber) return null;
  const p = einsatz.pfad;
  const info = schrittInfo(einsatz.schritt);
  const schluessel = `${p.kunde}/${p.system}/${p.variante}`;
  return (
    <Link
      href={`/${p.auftraggeber}/${schluessel}`}
      className="flex min-h-16 items-center gap-3 rounded-xl border-2 border-akzent-hover bg-akzent-hell px-4 py-3"
    >
      <History className="size-6 shrink-0" aria-hidden />
      <span className="flex-1">
        <span className="block font-semibold">Leitfaden fortsetzen</span>
        <span className="block text-sm text-text-leise">
          {namen[schluessel] ?? schluessel} · Schritt {info.nummer} {info.titel}
        </span>
      </span>
      <ChevronRight className="size-5" aria-hidden />
    </Link>
  );
}
