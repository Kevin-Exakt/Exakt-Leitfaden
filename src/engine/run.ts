/**
 * Diagnose-Engine: berechnet aus Ablauf + bisherigen Antworten den aktuellen Knoten.
 *
 * Die Engine hat keinen eigenen Zustand. Der Verlauf (Liste der gegebenen
 * Antworten) ist die einzige Wahrheit. Daraus folgen:
 *   - Zurück       = letzten Eintrag entfernen
 *   - Korrigieren  = alle Einträge ab Position X verwerfen
 *   - Simulation   = derselbe Code, nur ohne Speichern
 *
 * Reines TypeScript – keine Abhängigkeit zu Next.js, React oder Dateisystem.
 */
import type { Antwort, Flow, Knoten } from "../content/schema";

/** Eine gegebene Antwort. Wird so im Einsatz gespeichert. */
export type VerlaufEintrag = {
  knoten: string;
  antwort: string;
};
export type Verlauf = readonly VerlaufEintrag[];

export type Stand = {
  /** Knoten, der jetzt angezeigt wird. */
  knoten: Knoten;
  /** Bereinigter Verlauf, der zu diesem Knoten geführt hat. */
  verlauf: Verlauf;
  beendet: boolean;
  /**
   * true, wenn der gespeicherte Verlauf nicht mehr zum Ablauf passte
   * (z. B. weil der Inhalt inzwischen geändert wurde) und gekürzt wurde.
   */
  gekuerzt: boolean;
};

/** Schutz gegen Endlosschleifen in fehlerhaften Inhalten. */
const MAX_SCHRITTE = 500;

export class EngineFehler extends Error {}

function knotenMap(flow: Flow): Map<string, Knoten> {
  return new Map(flow.knoten.map((k) => [k.id, k]));
}

function holeKnoten(map: Map<string, Knoten>, id: string, flow: Flow): Knoten {
  const k = map.get(id);
  if (!k) throw new EngineFehler(`Ablauf "${flow.id}": Knoten "${id}" existiert nicht.`);
  return k;
}

/** Spielt den Verlauf ab und liefert den aktuellen Stand. */
export function stand(flow: Flow, verlauf: Verlauf = []): Stand {
  const map = knotenMap(flow);
  let aktuell = holeKnoten(map, flow.start, flow);
  const gueltig: VerlaufEintrag[] = [];

  for (const eintrag of verlauf.slice(0, MAX_SCHRITTE)) {
    const antwort = aktuell.antworten.find((a) => a.id === eintrag.antwort);
    if (eintrag.knoten !== aktuell.id || !antwort) {
      return { knoten: aktuell, verlauf: gueltig, beendet: aktuell.art === "ergebnis", gekuerzt: true };
    }
    gueltig.push(eintrag);
    aktuell = holeKnoten(map, antwort.weiter, flow);
  }

  return {
    knoten: aktuell,
    verlauf: gueltig,
    beendet: aktuell.art === "ergebnis",
    gekuerzt: gueltig.length !== verlauf.length,
  };
}

export type AntwortOptionen = {
  /** Muss true sein, wenn der Knoten eine Pflichtbestätigung hat. */
  bestaetigt?: boolean;
};

/** Beantwortet den aktuellen Knoten und liefert den neuen Verlauf. */
export function antworten(
  flow: Flow,
  verlauf: Verlauf,
  antwortId: string,
  optionen: AntwortOptionen = {},
): Verlauf {
  const { knoten, verlauf: bereinigt } = stand(flow, verlauf);
  if (knoten.art === "ergebnis") throw new EngineFehler("Der Ablauf ist bereits beendet.");
  if (knoten.pflicht && !optionen.bestaetigt)
    throw new EngineFehler(`"${knoten.titel}" erfordert eine Pflichtbestätigung.`);
  const antwort = knoten.antworten.find((a) => a.id === antwortId);
  if (!antwort) throw new EngineFehler(`Antwort "${antwortId}" gibt es bei "${knoten.titel}" nicht.`);
  return [...bereinigt, { knoten: knoten.id, antwort: antwort.id }];
}

/** Einen Schritt zurück. */
export function zurueck(verlauf: Verlauf): Verlauf {
  return verlauf.slice(0, -1);
}

/** Antwort an Position `index` korrigieren: alles ab dort wird verworfen. */
export function korrigieren(verlauf: Verlauf, index: number): Verlauf {
  return verlauf.slice(0, Math.max(0, index));
}

export type PfadSchritt = { knoten: Knoten; antwort: Antwort };

/** Der bisher gegangene Weg mit vollständigen Knoten- und Antwortdaten. */
export function pfad(flow: Flow, verlauf: Verlauf): PfadSchritt[] {
  const map = knotenMap(flow);
  const { verlauf: gueltig } = stand(flow, verlauf);
  return gueltig.map((e) => {
    const knoten = holeKnoten(map, e.knoten, flow);
    return { knoten, antwort: knoten.antworten.find((a) => a.id === e.antwort)! };
  });
}

/**
 * Kurzfassung für das Telefonat mit dem Innendienst, z. B.
 * "Fährt nicht auf: Hat die Steuereinheit Strom? → Ja › Dreht der Motor? → Nein"
 */
export function zusammenfassung(flow: Flow, verlauf: Verlauf): string {
  const s = stand(flow, verlauf);
  const schritte = pfad(flow, s.verlauf).map((p) => `${p.knoten.titel} → ${p.antwort.label}`);
  const ende = s.beendet ? ` ⇒ ${s.knoten.titel}` : ` (aktuell: ${s.knoten.titel})`;
  return `${flow.titel}: ${schritte.length ? schritte.join(" › ") : "noch keine Antwort"}${ende}`;
}
