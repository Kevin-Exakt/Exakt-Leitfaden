/**
 * Prüft einen einzelnen Ablauf auf Strukturfehler.
 * Reines TypeScript – keine Abhängigkeit zu Next.js, React oder Dateisystem.
 */
import type { ErgebnisTyp, Flow, FlowTyp } from "../content/schema";

export type Problem = {
  schwere: "fehler" | "warnung";
  meldung: string;
  /** Wo das Problem liegt (Datei, Ablauf, Knoten). */
  ort: string;
};

export const ERLAUBTE_ERGEBNISSE: Record<FlowTyp, readonly ErgebnisTyp[]> = {
  funktionstest: ["bestanden", "nicht-bestanden", "teilweise", "eskalation"],
  diagnose: ["reparatur", "behoben", "kein-befund", "eskalation"],
  rueckwaerts: ["reparatur", "behoben", "kein-befund", "eskalation"],
  reparatur: ["abgeschlossen", "eskalation"],
};

export function validateFlow(flow: Flow, ort = `Ablauf "${flow.id}"`): Problem[] {
  const probleme: Problem[] = [];
  const fehler = (meldung: string, knotenId?: string) =>
    probleme.push({ schwere: "fehler", meldung, ort: knotenId ? `${ort} › Knoten "${knotenId}"` : ort });

  // Eindeutige Knoten-IDs
  const knoten = new Map<string, Flow["knoten"][number]>();
  for (const k of flow.knoten) {
    if (knoten.has(k.id)) fehler(`Knoten-ID "${k.id}" ist doppelt vergeben.`, k.id);
    knoten.set(k.id, k);
  }

  if (!knoten.has(flow.start)) fehler(`Startknoten "${flow.start}" existiert nicht.`);

  for (const k of flow.knoten) {
    if (k.art === "ergebnis") {
      if (!k.ergebnis) fehler(`Ergebnisknoten braucht ein Feld "ergebnis".`, k.id);
      else if (!ERLAUBTE_ERGEBNISSE[flow.typ].includes(k.ergebnis))
        fehler(
          `Ergebnis "${k.ergebnis}" ist in einem Ablauf vom Typ "${flow.typ}" nicht erlaubt ` +
            `(erlaubt: ${ERLAUBTE_ERGEBNISSE[flow.typ].join(", ")}).`,
          k.id,
        );
      if (k.antworten.length > 0) fehler(`Ergebnisknoten darf keine Antworten haben.`, k.id);
      if (k.ergebnis === "reparatur" && !k.reparatur)
        fehler(`Ergebnis "reparatur" braucht ein Feld "reparatur" (ID des Reparaturleitfadens).`, k.id);
    } else {
      if (k.ergebnis || k.reparatur)
        fehler(`"ergebnis"/"reparatur" sind nur bei art: ergebnis erlaubt.`, k.id);
      if (k.antworten.length === 0)
        fehler(`Knoten hat keine Antworten – der Techniker käme hier nicht weiter.`, k.id);
    }

    const antwortIds = new Set<string>();
    for (const a of k.antworten) {
      if (antwortIds.has(a.id))
        fehler(`Antwort-ID "${a.id}" ist doppelt. Bitte bei einer Antwort "id:" setzen.`, k.id);
      antwortIds.add(a.id);
      if (!knoten.has(a.weiter)) fehler(`Antwort "${a.label}" verweist auf unbekannten Knoten "${a.weiter}".`, k.id);
      if (a.weiter === k.id) fehler(`Antwort "${a.label}" verweist auf den eigenen Knoten.`, k.id);
    }

    if (k.inhalt.some((b) => b.typ === "sicherheit") && !k.pflicht)
      fehler(`Knoten enthält einen Sicherheitshinweis, aber keine Pflichtbestätigung ("pflicht").`, k.id);
  }

  if (!knoten.has(flow.start)) return probleme;

  // Erreichbarkeit vom Start
  const erreichbar = new Set<string>();
  const stapel = [flow.start];
  while (stapel.length) {
    const id = stapel.pop()!;
    if (erreichbar.has(id) || !knoten.has(id)) continue;
    erreichbar.add(id);
    for (const a of knoten.get(id)!.antworten) stapel.push(a.weiter);
  }
  for (const k of flow.knoten)
    if (!erreichbar.has(k.id))
      probleme.push({
        schwere: "warnung",
        meldung: `Knoten ist vom Start aus nicht erreichbar.`,
        ort: `${ort} › Knoten "${k.id}"`,
      });

  // Jeder erreichbare Knoten muss ein Ende erreichen können (keine Endlosschleifen / Sackgassen)
  const vorgaenger = new Map<string, string[]>();
  for (const k of flow.knoten)
    for (const a of k.antworten) vorgaenger.set(a.weiter, [...(vorgaenger.get(a.weiter) ?? []), k.id]);
  const fuehrtZumEnde = new Set<string>();
  const rueck = flow.knoten.filter((k) => k.art === "ergebnis").map((k) => k.id);
  while (rueck.length) {
    const id = rueck.pop()!;
    if (fuehrtZumEnde.has(id)) continue;
    fuehrtZumEnde.add(id);
    rueck.push(...(vorgaenger.get(id) ?? []));
  }
  for (const id of erreichbar)
    if (!fuehrtZumEnde.has(id))
      fehler(`Von hier aus wird nie ein Ergebnis erreicht (Endlosschleife oder Sackgasse).`, id);

  return probleme;
}
