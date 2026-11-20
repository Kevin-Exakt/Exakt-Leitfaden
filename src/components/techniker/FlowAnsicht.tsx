"use client";
import { Check, ChevronDown, CircleHelp, ClipboardList, OctagonAlert, Pencil, Wrench, X } from "lucide-react";
import { useState } from "react";
import type { Antwort, Flow } from "@/src/content/schema";
import { pfad, stand, type Verlauf } from "@/src/engine/run";
import { Bloecke } from "../blocks/Bloecke";
import { Button, type ButtonVariante } from "../ui/Button";
import { CheckItem } from "../ui/CheckItem";
import { EntwurfBadge } from "../ui/Karte";
import { Aktionsleiste } from "../ui/Rahmen";

export type FlowAnsichtProps = {
  flow: Flow;
  verlauf: Verlauf;
  /** Abgehakte Punkte der Pflichtbestätigung des aktuellen Knotens ("haupt", "0", "1" …). */
  bestaetigt: string[];
  onBestaetigung: (punkt: string) => void;
  onAntwort: (antwortId: string) => void;
  onZurueck: () => void;
  onKorrigieren: (index: number) => void;
  /** Namen aus der Vorbereitung für „benötigt“. */
  namen: Record<string, string>;
  /** Wird statt der Antwortbuttons angezeigt, wenn der Ablauf beendet ist. */
  ergebnisAktionen?: React.ReactNode;
};

const ANTWORT_STIL: Record<Antwort["typ"], { variante: ButtonVariante; icon?: React.ReactNode }> = {
  ja: { variante: "ja", icon: <Check className="size-6" strokeWidth={3} /> },
  nein: { variante: "nein", icon: <X className="size-6" strokeWidth={3} /> },
  "nicht-moeglich": { variante: "neutral", icon: <CircleHelp className="size-5" /> },
  sonstige: { variante: "neutral" },
};

export function FlowAnsicht(p: FlowAnsichtProps) {
  const s = stand(p.flow, p.verlauf);
  const k = s.knoten;
  const pflichtOk =
    !k.pflicht || (p.bestaetigt.includes("haupt") && k.pflicht.punkte.every((_, i) => p.bestaetigt.includes(String(i))));

  const jaNein = k.antworten.filter((a) => a.typ === "ja" || a.typ === "nein");
  const andere = k.antworten.filter((a) => a.typ !== "ja" && a.typ !== "nein");
  const benoetigt = [...(s.verlauf.length === 0 ? p.flow.benoetigt : []), ...k.benoetigt];

  return (
    <>
      <main className="flex-1 space-y-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-leise">
          <span className="font-medium">{p.flow.titel}</span>
          {p.flow.status === "entwurf" && <EntwurfBadge />}
        </div>

        {s.gekuerzt && (
          <p className="rounded-lg bg-warnung-hell p-3 text-sm text-orange-950">
            Der Ablauf wurde inzwischen geändert. Bisherige Antworten wurden bis zur letzten passenden Stelle übernommen.
          </p>
        )}

        {s.verlauf.length === 0 && <Bloecke bloecke={p.flow.hinweise} />}

        <div className={`rounded-2xl border-2 bg-karte p-5 ${k.art === "ergebnis" ? ergebnisRahmen(k.ergebnis) : "border-rand"}`}>
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-leise">
            {k.art === "frage" ? `Prüfung ${s.verlauf.length + 1}` : k.art === "anweisung" ? "Arbeitsschritt" : "Ergebnis"}
            {k.komponente && ` · ${k.komponente}`}
          </p>
          <h2 className="text-2xl font-bold leading-tight">{k.titel}</h2>
          {k.erwarteterZustand && <p className="mt-2 text-text-leise">Sollzustand: {k.erwarteterZustand}</p>}
        </div>

        {benoetigt.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {benoetigt.map((id) => (
              <span key={id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-sm">
                <Wrench className="size-4 text-text-leise" aria-hidden />
                {p.namen[id] ?? id}
              </span>
            ))}
          </div>
        )}

        <Bloecke bloecke={k.inhalt} />

        {k.pflicht && (
          <div className="space-y-2 rounded-xl border-2 border-red-300 bg-sicherheit-hell p-3">
            <p className="flex items-center gap-2 font-semibold text-sicherheit">
              <OctagonAlert className="size-5" aria-hidden /> Pflichtbestätigung
            </p>
            {k.pflicht.punkte.map((punkt, i) => (
              <CheckItem key={i} an={p.bestaetigt.includes(String(i))} onUmschalten={() => p.onBestaetigung(String(i))} ton="sicherheit">
                {punkt}
              </CheckItem>
            ))}
            <CheckItem an={p.bestaetigt.includes("haupt")} onUmschalten={() => p.onBestaetigung("haupt")} ton="sicherheit">
              {k.pflicht.text}
            </CheckItem>
          </div>
        )}

        <VerlaufListe flow={p.flow} verlauf={s.verlauf} onKorrigieren={p.onKorrigieren} />
      </main>

      <Aktionsleiste>
        {k.art === "ergebnis" ? (
          <>
            {p.ergebnisAktionen}
            <Button variante="leise" gross={false} breit onClick={p.onZurueck}>
              Letzte Antwort ändern
            </Button>
          </>
        ) : (
          <>
            {!pflichtOk && <p className="text-center text-sm font-medium text-sicherheit">Erst Pflichtbestätigung abhaken.</p>}
            {jaNein.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {jaNein.map((a) => (
                  <AntwortButton key={a.id} antwort={a} gesperrt={!pflichtOk} onClick={() => p.onAntwort(a.id)} />
                ))}
              </div>
            )}
            {andere.map((a) => (
              <AntwortButton key={a.id} antwort={a} gesperrt={!pflichtOk} onClick={() => p.onAntwort(a.id)} />
            ))}
          </>
        )}
      </Aktionsleiste>
    </>
  );
}

function AntwortButton({ antwort, gesperrt, onClick }: { antwort: Antwort; gesperrt: boolean; onClick: () => void }) {
  const stil = ANTWORT_STIL[antwort.typ];
  return (
    <Button variante={stil.variante} icon={stil.icon} breit disabled={gesperrt} onClick={onClick}>
      {antwort.label}
    </Button>
  );
}

function ergebnisRahmen(e?: string) {
  if (e === "bestanden" || e === "behoben" || e === "abgeschlossen") return "border-ok bg-ok-hell";
  if (e === "eskalation" || e === "nicht-bestanden") return "border-red-300 bg-sicherheit-hell";
  return "border-akzent bg-akzent-hell";
}

function VerlaufListe({ flow, verlauf, onKorrigieren }: { flow: Flow; verlauf: Verlauf; onKorrigieren: (i: number) => void }) {
  const [offen, setOffen] = useState(false);
  const schritte = pfad(flow, verlauf);
  if (!schritte.length) return null;
  return (
    <div className="rounded-xl border border-rand bg-karte">
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left font-medium"
      >
        <ClipboardList className="size-5 text-text-leise" aria-hidden />
        <span className="flex-1">Bisherige Antworten ({schritte.length})</span>
        <ChevronDown className={`size-5 transition-transform ${offen ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {offen && (
        <ol className="divide-y divide-rand border-t border-rand">
          {schritte.map((sch, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onKorrigieren(i)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-flaeche"
              >
                <span className="flex-1">
                  <span className="block text-sm text-text-leise">{sch.knoten.titel}</span>
                  <span className="block font-semibold">{sch.antwort.label}</span>
                </span>
                <Pencil className="size-4 text-text-leise" aria-label="Ändern" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
