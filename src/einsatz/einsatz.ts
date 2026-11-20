/**
 * Ablaufsteuerung eines Serviceeinsatzes (Step 1 bis 7).
 *
 * Reines TypeScript ohne React: Jede Funktion bekommt den aktuellen Einsatz
 * und gibt einen neuen zurück. Die Oberfläche speichert das Ergebnis nur.
 *
 * Regeln (aus dem Konzept):
 *  - Jedes ausgewählte Fehlerbild wird nacheinander diagnostiziert.
 *  - Nach Reparatur, Behebung oder Eskalation folgt IMMER der Nachtest (Step 5).
 *  - Abmeldung (6) und Dokumentation (7) erst nach bestandenem Nachtest –
 *    oder nach bewusstem Abschluss „nicht erfolgreich“.
 */
import type { ErgebnisTyp, Flow, Variante } from "../content/schema";
import { STANDARD_FUNKTIONSTEST } from "./standard";
import { antworten as engineAntworten, korrigieren, stand, zurueck, zusammenfassung, type Verlauf } from "../engine/run";

/* ------------------------------------------------------------------ */
/* Typen                                                               */
/* ------------------------------------------------------------------ */

export type Schritt =
  | { typ: "vorbereitung" }
  | { typ: "ankunft" }
  | { typ: "aufnahme" }
  | { typ: "funktionstest" }
  | { typ: "diagnose"; fehlerbild: string; verfahren: "diagnose" | "rueckwaerts" }
  | { typ: "reparatur"; fehlerbild: string; flow: string }
  | { typ: "nachtest" }
  | { typ: "restfehler" }
  | { typ: "abmeldung" }
  | { typ: "dokumentation" }
  | { typ: "abgeschlossen" };

export type FehlerbildStatus = "offen" | "repariert" | "behoben" | "eskaliert" | "nicht-mehr-vorhanden";

export type Einsatz = {
  /** 2 = Pfad mit auftraggeber/kunde (statt kunde/bereich). */
  version: 2;
  id: string;
  pfad: { auftraggeber: string; kunde: string; system: string; variante: string };
  gestartetAm: string;
  schritt: Schritt;
  /** Vorherige Schritte – für „Zurück“. */
  historie: Schritt[];
  vorbereitung: string[];
  ankunft: string[];
  fehlerbilder: string[];
  fehlerbildStatus: Record<string, FehlerbildStatus>;
  notiz: string;
  /** Antwortverläufe je Ablauf-Slot, z. B. "funktionstest", "diagnose:faehrt-nicht-auf". */
  laeufe: Record<string, Verlauf>;
  /** Abgehakte Pflichtbestätigungen je Slot + Knoten. */
  bestaetigungen: Record<string, string[]>;
  /**
   * Zusammenfassungen abgeschlossener Abläufe – für den Innendienst.
   * Schlüssel = Slot + Durchgang, damit „Zurück“ und erneutes „Weiter“ keine Doppelungen erzeugt.
   */
  protokoll: { schluessel: string; text: string }[];
  nachtestVersuche: number;
  ergebnis?: "erfolgreich" | "nicht-erfolgreich" | "kein-fehler";
};

export class EinsatzFehler extends Error {}

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

export function neuerEinsatz(pfad: Einsatz["pfad"], jetzt = new Date()): Einsatz {
  return {
    version: 2,
    id: `${jetzt.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    pfad,
    gestartetAm: jetzt.toISOString(),
    // Leitfaden beginnt direkt mit der Auswahl des Fehlerbilds (Vorbereitung/Ankunft entfallen)
    schritt: { typ: "aufnahme" },
    historie: [],
    vorbereitung: [],
    ankunft: [],
    fehlerbilder: [],
    fehlerbildStatus: {},
    notiz: "",
    laeufe: {},
    bestaetigungen: {},
    protokoll: [],
    nachtestVersuche: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Abläufe im aktuellen Schritt                                        */
/* ------------------------------------------------------------------ */

/** Welcher Ablauf (Slot + Flow) gehört zum aktuellen Schritt? */
export function aktiverLauf(e: Einsatz, v: Variante): { slot: string; flow: Flow } | null {
  const s = e.schritt;
  const holen = (id: string | undefined) => (id ? v.flows[id] : undefined);
  let slot: string | undefined;
  let flow: Flow | undefined;
  switch (s.typ) {
    case "funktionstest":
      slot = "funktionstest";
      flow = holen(v.funktionstest) ?? STANDARD_FUNKTIONSTEST;
      break;
    case "nachtest":
      slot = "nachtest";
      flow = holen(v.nachtest ?? v.funktionstest) ?? STANDARD_FUNKTIONSTEST;
      break;
    case "diagnose": {
      const fb = v.fehlerbilder.find((f) => f.id === s.fehlerbild);
      slot = `${s.verfahren}:${s.fehlerbild}`;
      flow = holen(s.verfahren === "diagnose" ? fb?.diagnose : fb?.rueckwaerts);
      break;
    }
    case "reparatur":
      slot = `reparatur:${s.fehlerbild}:${s.flow}`;
      flow = holen(s.flow);
      break;
  }
  return slot && flow ? { slot, flow } : null;
}

/** Ergebnis des aktiven Ablaufs, falls beendet. */
export function laufErgebnis(e: Einsatz, v: Variante): { ergebnis: ErgebnisTyp; reparatur?: string } | null {
  const lauf = aktiverLauf(e, v);
  if (!lauf) return null;
  const st = stand(lauf.flow, e.laeufe[lauf.slot] ?? []);
  if (!st.beendet || !st.knoten.ergebnis) return null;
  return { ergebnis: st.knoten.ergebnis, reparatur: st.knoten.reparatur };
}

function setzeLauf(e: Einsatz, slot: string, verlauf: Verlauf): Einsatz {
  return { ...e, laeufe: { ...e.laeufe, [slot]: verlauf } };
}

export function antworten(e: Einsatz, v: Variante, antwortId: string): Einsatz {
  const lauf = aktiverLauf(e, v);
  if (!lauf) throw new EinsatzFehler("In diesem Schritt gibt es keinen Ablauf.");
  const verlauf = e.laeufe[lauf.slot] ?? [];
  const knoten = stand(lauf.flow, verlauf).knoten;
  const bestaetigt = knoten.pflicht ? pflichtErfuellt(e, lauf.slot, knoten.id, knoten.pflicht.punkte.length) : false;
  return setzeLauf(e, lauf.slot, engineAntworten(lauf.flow, verlauf, antwortId, { bestaetigt }));
}

export function laufZurueck(e: Einsatz, v: Variante): Einsatz {
  const lauf = aktiverLauf(e, v);
  if (!lauf) return e;
  return setzeLauf(e, lauf.slot, zurueck(e.laeufe[lauf.slot] ?? []));
}

export function laufKorrigieren(e: Einsatz, v: Variante, index: number): Einsatz {
  const lauf = aktiverLauf(e, v);
  if (!lauf) return e;
  return setzeLauf(e, lauf.slot, korrigieren(e.laeufe[lauf.slot] ?? [], index));
}

/* ------------------------------------------------------------------ */
/* Pflichtbestätigungen                                                */
/* ------------------------------------------------------------------ */

const bestaetigungsSchluessel = (slot: string, knotenId: string) => `${slot}#${knotenId}`;

/** Punkt "haupt" = Haupttext; weitere Punkte als "0", "1", … */
export function bestaetigungUmschalten(e: Einsatz, slot: string, knotenId: string, punkt: string): Einsatz {
  const key = bestaetigungsSchluessel(slot, knotenId);
  const aktuell = e.bestaetigungen[key] ?? [];
  const neu = aktuell.includes(punkt) ? aktuell.filter((p) => p !== punkt) : [...aktuell, punkt];
  return { ...e, bestaetigungen: { ...e.bestaetigungen, [key]: neu } };
}

export function bestaetigtePunkte(e: Einsatz, slot: string, knotenId: string): string[] {
  return e.bestaetigungen[bestaetigungsSchluessel(slot, knotenId)] ?? [];
}

export function pflichtErfuellt(e: Einsatz, slot: string, knotenId: string, anzahlPunkte: number): boolean {
  const p = bestaetigtePunkte(e, slot, knotenId);
  if (!p.includes("haupt")) return false;
  for (let i = 0; i < anzahlPunkte; i++) if (!p.includes(String(i))) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Checklisten & Fehleraufnahme                                        */
/* ------------------------------------------------------------------ */

export function checkUmschalten(e: Einsatz, liste: "vorbereitung" | "ankunft", id: string): Einsatz {
  const aktuell = e[liste];
  return { ...e, [liste]: aktuell.includes(id) ? aktuell.filter((x) => x !== id) : [...aktuell, id] };
}

export function fehlerbildUmschalten(e: Einsatz, id: string): Einsatz {
  const fehlerbilder = e.fehlerbilder.includes(id) ? e.fehlerbilder.filter((x) => x !== id) : [...e.fehlerbilder, id];
  return { ...e, fehlerbilder };
}

export function notizSetzen(e: Einsatz, notiz: string): Einsatz {
  return { ...e, notiz };
}

/* ------------------------------------------------------------------ */
/* Schrittwechsel                                                      */
/* ------------------------------------------------------------------ */

export type Kontext = {
  variante: Variante;
  /** Pflicht-IDs der Ankunft-Checkliste (auftraggeberabhängig). */
  ankunftPflicht: string[];
};

/** Darf der Techniker aus dem aktuellen Schritt weiter? Liefert sonst den Grund. */
export function kannWeiter(e: Einsatz, k: Kontext): { ok: true } | { ok: false; grund: string } {
  const v = k.variante;
  switch (e.schritt.typ) {
    case "vorbereitung": {
      const vb = v.vorbereitung;
      const pflicht = [...vb.werkzeug, ...vb.messgeraete, ...vb.material, ...vb.ersatzteile, ...vb.dokumente]
        .filter((x) => x.pflicht)
        .map((x) => x.id);
      const offen = pflicht.filter((id) => !e.vorbereitung.includes(id)).length;
      return offen ? { ok: false, grund: `Noch ${offen} Pflichtpunkt(e) abhaken.` } : { ok: true };
    }
    case "ankunft": {
      const offen = k.ankunftPflicht.filter((id) => !e.ankunft.includes(id)).length;
      return offen ? { ok: false, grund: `Noch ${offen} Pflichtpunkt(e) abhaken.` } : { ok: true };
    }
    case "aufnahme":
      return e.fehlerbilder.length ? { ok: true } : { ok: false, grund: "Mindestens ein Fehlerbild auswählen." };
    case "funktionstest":
    case "nachtest":
    case "reparatur":
      return laufErgebnis(e, v) ? { ok: true } : { ok: false, grund: "Ablauf zuerst abschließen." };
    case "diagnose": {
      // Ohne hinterlegten Ablauf darf weitergegangen werden (→ Eskalation).
      if (!aktiverLauf(e, v)) return { ok: true };
      return laufErgebnis(e, v) ? { ok: true } : { ok: false, grund: "Diagnose zuerst abschließen." };
    }
    case "restfehler":
      return offeneFehlerbilder(e).length ? { ok: false, grund: "Für jedes Fehlerbild angeben, ob es noch besteht." } : { ok: true };
    case "abmeldung":
    case "dokumentation":
      return { ok: true };
    case "abgeschlossen":
      return { ok: false, grund: "Einsatz ist abgeschlossen." };
  }
}

export function offeneFehlerbilder(e: Einsatz): string[] {
  return e.fehlerbilder.filter((id) => (e.fehlerbildStatus[id] ?? "offen") === "offen");
}

function gehe(e: Einsatz, schritt: Schritt): Einsatz {
  return { ...e, historie: [...e.historie, e.schritt], schritt };
}

function protokolliere(e: Einsatz, v: Variante): Einsatz {
  const lauf = aktiverLauf(e, v);
  if (!lauf) return e;
  const schluessel = `${lauf.slot}@${e.nachtestVersuche}`;
  const text = zusammenfassung(lauf.flow, e.laeufe[lauf.slot] ?? []);
  return { ...e, protokoll: [...e.protokoll.filter((p) => p.schluessel !== schluessel), { schluessel, text }] };
}

function diagnoseSchritt(v: Variante, fehlerbildId: string): Schritt {
  const fb = v.fehlerbilder.find((f) => f.id === fehlerbildId);
  return { typ: "diagnose", fehlerbild: fehlerbildId, verfahren: !fb?.diagnose && fb?.rueckwaerts ? "rueckwaerts" : "diagnose" };
}

function setzeStatus(e: Einsatz, id: string, status: FehlerbildStatus): Einsatz {
  return { ...e, fehlerbildStatus: { ...e.fehlerbildStatus, [id]: status } };
}

/** Nächstes offenes Fehlerbild diagnostizieren – oder zum Nachtest. */
function naechstesFehlerbildOderNachtest(e: Einsatz, v: Variante): Einsatz {
  const naechstes = offeneFehlerbilder(e)[0];
  return naechstes ? gehe(e, diagnoseSchritt(v, naechstes)) : gehe(e, { typ: "nachtest" });
}

/** Standard-Weiter aus dem aktuellen Schritt. */
export function weiter(e: Einsatz, k: Kontext): Einsatz {
  const pruefung = kannWeiter(e, k);
  if (!pruefung.ok) throw new EinsatzFehler(pruefung.grund);
  const v = k.variante;
  const s = e.schritt;

  switch (s.typ) {
    case "vorbereitung":
      // Schritt „Ankunft“ entfällt – direkt zur Fehleraufnahme
      return gehe(e, { typ: "aufnahme" });
    case "ankunft":
      return gehe(e, { typ: "aufnahme" });
    case "aufnahme": {
      // Status für neu gewählte Fehlerbilder anlegen, abgewählte entfernen
      const fehlerbildStatus: Record<string, FehlerbildStatus> = {};
      for (const id of e.fehlerbilder) fehlerbildStatus[id] = e.fehlerbildStatus[id] ?? "offen";
      // Funktionstest vor der Analyse nur, wenn das System einen eigenen hat –
      // sonst ist der Fehler mit der Auswahl bereits festgestellt → direkt zur Fehleranalyse.
      if (v.funktionstest && v.flows[v.funktionstest]) return gehe({ ...e, fehlerbildStatus }, { typ: "funktionstest" });
      return naechstesFehlerbildOderNachtest({ ...e, fehlerbildStatus }, v);
    }
    case "funktionstest":
      return naechstesFehlerbildOderNachtest(protokolliere(e, v), v);

    case "diagnose": {
      const erg = laufErgebnis(e, v);
      const e2 = protokolliere(e, v);
      if (!erg) {
        // kein Ablauf hinterlegt
        return naechstesFehlerbildOderNachtest(setzeStatus(e2, s.fehlerbild, "eskaliert"), v);
      }
      switch (erg.ergebnis) {
        case "reparatur":
          return gehe(e2, { typ: "reparatur", fehlerbild: s.fehlerbild, flow: erg.reparatur! });
        case "behoben":
          return gehe(setzeStatus(e2, s.fehlerbild, "behoben"), { typ: "nachtest" });
        case "in-ordnung":
          // Kein Fehler – nächstes Fehlerbild bzw. Nachtest
          return naechstesFehlerbildOderNachtest(setzeStatus(e2, s.fehlerbild, "nicht-mehr-vorhanden"), v);
        default: // kein-befund, eskalation
          return naechstesFehlerbildOderNachtest(setzeStatus(e2, s.fehlerbild, "eskaliert"), v);
      }
    }

    case "reparatur": {
      const erg = laufErgebnis(e, v)!;
      const status: FehlerbildStatus = erg.ergebnis === "abgeschlossen" ? "repariert" : "eskaliert";
      return gehe(setzeStatus(protokolliere(e, v), s.fehlerbild, status), { typ: "nachtest" });
    }

    case "nachtest": {
      const erg = laufErgebnis(e, v)!;
      const e2 = { ...protokolliere(e, v), nachtestVersuche: e.nachtestVersuche + 1 };
      if (erg.ergebnis === "bestanden") {
        if (offeneFehlerbilder(e2).length) return gehe(e2, { typ: "restfehler" });
        return gehe({ ...e2, ergebnis: "erfolgreich" }, { typ: "abmeldung" });
      }
      // Nicht bestanden: zurück zur Fehleranalyse des zuletzt bearbeiteten Fehlerbilds
      return zurueckZurDiagnose(e2, v);
    }

    case "restfehler":
      return gehe({ ...e, ergebnis: "erfolgreich" }, { typ: "abmeldung" });
    case "abmeldung":
      return gehe(e, { typ: "dokumentation" });
    case "dokumentation":
      return gehe(e, { typ: "abgeschlossen" });
    case "abgeschlossen":
      return e;
  }
}

/** Nachtest nicht bestanden → zuletzt bearbeitetes Fehlerbild erneut diagnostizieren. */
function zurueckZurDiagnose(e: Einsatz, v: Variante): Einsatz {
  const zuletzt =
    [...e.historie].reverse().find((h): h is Extract<Schritt, { typ: "diagnose" }> => h.typ === "diagnose")
      ?.fehlerbild ?? e.fehlerbilder[0];
  const ziel = diagnoseSchritt(v, zuletzt);
  // Abläufe dieses Fehlerbilds und den Nachtest zurücksetzen – inkl. Pflichtbestätigungen,
  // damit Sicherheitsschritte im neuen Durchgang erneut bestätigt werden müssen.
  const betroffen = (slot: string) =>
    slot === "nachtest" || slot.endsWith(`:${zuletzt}`) || slot.includes(`:${zuletzt}:`);
  const laeufe = Object.fromEntries(Object.entries(e.laeufe).filter(([slot]) => !betroffen(slot)));
  const bestaetigungen = Object.fromEntries(
    Object.entries(e.bestaetigungen).filter(([key]) => !betroffen(key.split("#")[0])),
  );
  return gehe({ ...setzeStatus(e, zuletzt, "offen"), laeufe, bestaetigungen }, ziel);
}

/* ------------------------------------------------------------------ */
/* Sonderwege                                                          */
/* ------------------------------------------------------------------ */

/** Funktionstest bestanden, kein Fehler feststellbar → direkt zur Abmeldung. */
export function keinFehlerFeststellbar(e: Einsatz, v: Variante): Einsatz {
  if (e.schritt.typ !== "funktionstest" || laufErgebnis(e, v)?.ergebnis !== "bestanden")
    throw new EinsatzFehler("Nur nach bestandenem Funktionstest möglich.");
  return gehe({ ...protokolliere(e, v), ergebnis: "kein-fehler" }, { typ: "abmeldung" });
}

/** Diagnose ohne Befund → Rückwärtsverfahren (Step 3.2) für dasselbe Fehlerbild starten. */
export function rueckwaertsStarten(e: Einsatz, v: Variante): Einsatz {
  const s = e.schritt;
  if (s.typ !== "diagnose") throw new EinsatzFehler("Nur in der Fehleranalyse möglich.");
  const fb = v.fehlerbilder.find((f) => f.id === s.fehlerbild);
  if (!fb?.rueckwaerts) throw new EinsatzFehler("Für dieses Fehlerbild gibt es kein Rückwärtsverfahren.");
  return gehe(protokolliere(e, v), { typ: "diagnose", fehlerbild: s.fehlerbild, verfahren: "rueckwaerts" });
}

/** Restfehler-Abfrage: Fehlerbild besteht nicht mehr. */
export function fehlerbildNichtMehrVorhanden(e: Einsatz, id: string): Einsatz {
  return setzeStatus(e, id, "nicht-mehr-vorhanden");
}

/** Restfehler-Abfrage: Fehlerbild besteht noch → diagnostizieren. */
export function fehlerbildDiagnostizieren(e: Einsatz, v: Variante, id: string): Einsatz {
  return gehe(e, diagnoseSchritt(v, id));
}

/** Einsatz bewusst als nicht erfolgreich beenden (z. B. nach Eskalation). */
export function nichtErfolgreichBeenden(e: Einsatz): Einsatz {
  return gehe({ ...e, ergebnis: "nicht-erfolgreich" }, { typ: "abmeldung" });
}

/** Zurück zum vorherigen Schritt (Eingaben bleiben erhalten). */
export function schrittZurueck(e: Einsatz): Einsatz {
  if (!e.historie.length) return e;
  return { ...e, schritt: e.historie[e.historie.length - 1], historie: e.historie.slice(0, -1) };
}

/* ------------------------------------------------------------------ */
/* Anzeige                                                             */
/* ------------------------------------------------------------------ */

export const SCHRITT_INFO: Record<Schritt["typ"], { nummer: string; titel: string; position: number }> = {
  vorbereitung: { nummer: "–", titel: "Vorbereitung (entfällt)", position: 0 },
  ankunft: { nummer: "–", titel: "Ankunft (entfällt)", position: 0 },
  aufnahme: { nummer: "1", titel: "Fehlerbild", position: 0 },
  funktionstest: { nummer: "1.1", titel: "Funktionstest", position: 0 },
  diagnose: { nummer: "2", titel: "Fehleranalyse", position: 1 },
  reparatur: { nummer: "3", titel: "Reparatur", position: 2 },
  nachtest: { nummer: "4", titel: "Funktionstest", position: 3 },
  restfehler: { nummer: "4", titel: "Weitere Fehlerbilder", position: 3 },
  abmeldung: { nummer: "5", titel: "Abmeldung", position: 4 },
  dokumentation: { nummer: "6", titel: "Dokumentation", position: 5 },
  abgeschlossen: { nummer: "✓", titel: "Abgeschlossen", position: 6 },
};
export const ANZAHL_POSITIONEN = 6;

export function schrittInfo(s: Schritt) {
  const info = SCHRITT_INFO[s.typ];
  if (s.typ === "diagnose" && s.verfahren === "rueckwaerts") return { ...info, nummer: "2.1", titel: "Rückwärtsverfahren" };
  return info;
}

/** Kurzbericht für das Telefonat mit dem Innendienst. */
export function einsatzZusammenfassung(e: Einsatz, v: Variante): string {
  const titel = (id: string) => v.fehlerbilder.find((f) => f.id === id)?.titel ?? id;
  const zeilen = [
    `Einsatz ${e.pfad.auftraggeber} / ${e.pfad.system} / ${e.pfad.variante}`,
    `Schritt: ${schrittInfo(e.schritt).nummer} ${schrittInfo(e.schritt).titel}`,
    `Fehlerbilder: ${e.fehlerbilder.map((id) => `${titel(id)} (${e.fehlerbildStatus[id] ?? "offen"})`).join(", ") || "–"}`,
  ];
  if (e.notiz.trim()) zeilen.push(`Notiz: ${e.notiz.trim()}`);
  zeilen.push(...e.protokoll.map((p) => `• ${p.text}`));
  const lauf = aktiverLauf(e, v);
  if (lauf && !laufErgebnis(e, v)) zeilen.push(`• ${zusammenfassung(lauf.flow, e.laeufe[lauf.slot] ?? [])}`);
  return zeilen.join("\n");
}

/**
 * Neuer Leitfaden mit bereits gewähltem Fehlerbild (z. B. aus der Schnellsuche):
 * Schritt 1 ist erledigt, es geht direkt beim Funktionstest los. „Zurück“ führt
 * zur Fehlerbild-Auswahl. Unbekannte Fehlerbilder werden ignoriert.
 */
export function neuerEinsatzMitFehlerbild(pfad: Einsatz["pfad"], k: Kontext, fehlerbildId?: string | null): Einsatz {
  const e = neuerEinsatz(pfad);
  if (!fehlerbildId || !k.variante.fehlerbilder.some((f) => f.id === fehlerbildId)) return e;
  return weiter(fehlerbildUmschalten(e, fehlerbildId), k);
}
