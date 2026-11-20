import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../content/load";
import { createRepository } from "../content/repository";
import {
  aktiverLauf,
  antworten,
  bestaetigungUmschalten,
  type Einsatz,
  EinsatzFehler,
  einsatzZusammenfassung,
  fehlerbildDiagnostizieren,
  fehlerbildNichtMehrVorhanden,
  fehlerbildUmschalten,
  kannWeiter,
  keinFehlerFeststellbar,
  type Kontext,
  neuerEinsatz,
  neuerEinsatzMitFehlerbild,
  nichtErfolgreichBeenden,
  schrittInfo,
  schrittZurueck,
  weiter,
} from "./einsatz";
import { EngineFehler, stand } from "../engine/run";

const pfad = { auftraggeber: "pan-oston", kunde: "lidl", system: "zigarettentraeger", variante: "nera" };
const repo = createRepository(loadContent(path.join(process.cwd(), "content")).tree);
const variante = repo.getVariante(pfad)!;
const auftraggeber = repo.getAuftraggeber("pan-oston")!;
const ankunft = auftraggeber.kunden.find((b) => b.id === "lidl")!.ankunft ?? auftraggeber.ankunft;
const k: Kontext = {
  variante,
  ankunftPflicht: ankunft.checkliste.filter((c) => c.pflicht).map((c) => c.id),
};

/** Beantwortet mehrere Fragen im aktuellen Ablauf. */
const antworte = (e: Einsatz, ...ids: string[]) => ids.reduce((acc, id) => antworten(acc, variante, id), e);

/** Fehlerbilder wählen (Schritt 1) und weiter zum Funktionstest. */
function bisFunktionstest(...fehlerbilder: string[]): Einsatz {
  let e = neuerEinsatz(pfad);
  for (const fb of fehlerbilder) e = fehlerbildUmschalten(e, fb);
  return weiter(e, k);
}

describe("Einsatzablauf", () => {
  it("beginnt mit Schritt 1 „Fehlerbild“ und verlangt mindestens ein Fehlerbild", () => {
    const e = neuerEinsatz(pfad);
    expect(e.schritt.typ).toBe("aufnahme");
    expect(schrittInfo(e.schritt)).toMatchObject({ nummer: "1", titel: "Fehlerbild" });
    expect(kannWeiter(e, k)).toEqual({ ok: false, grund: "Mindestens ein Fehlerbild auswählen." });
    expect(() => weiter(e, k)).toThrow(EinsatzFehler);
  });

  it("führt vollständig durch Diagnose → Reparatur → Nachtest → Abmeldung", () => {
    let e = bisFunktionstest("faehrt-nicht-auf");
    expect(e.schritt.typ).toBe("funktionstest");

    e = antworte(e, "ja", "nein"); // Funktionstest: nicht bestanden
    e = weiter(e, k);
    expect(e.schritt).toEqual({ typ: "diagnose", fehlerbild: "faehrt-nicht-auf", verfahren: "diagnose" });

    e = antworte(e, "ja", "nein", "ja"); // Strom ja, Motor dreht nicht, beschädigt
    e = weiter(e, k);
    expect(e.schritt).toEqual({ typ: "reparatur", fehlerbild: "faehrt-nicht-auf", flow: "motor-tauschen" });

    // Pflichtbestätigung: ohne Haken geht es nicht weiter
    expect(() => antworte(e, "weiter")).toThrow(EngineFehler);
    const slot = aktiverLauf(e, variante)!.slot;
    for (const p of ["haupt", "0", "1"]) e = bestaetigungUmschalten(e, slot, "voraussetzungen", p);
    e = antworte(e, "weiter", "erledigt", "erledigt", "ja");
    e = weiter(e, k);
    expect(e.schritt.typ).toBe("nachtest");
    expect(e.fehlerbildStatus["faehrt-nicht-auf"]).toBe("repariert");

    // Abmeldung erst nach bestandenem Nachtest
    expect(kannWeiter(e, k).ok).toBe(false);
    e = antworte(e, "ja", "ja", "ja");
    e = weiter(e, k);
    expect(e.schritt.typ).toBe("abmeldung");
    expect(e.ergebnis).toBe("erfolgreich");

    e = weiter(weiter(e, k), k);
    expect(e.schritt.typ).toBe("abgeschlossen");
    expect(e.protokoll.map((p) => p.text)).toHaveLength(4);
    expect(einsatzZusammenfassung(e, variante)).toContain("Motor tauschen");
  });

  it("Spannungsversorgung behoben → direkt zum Nachtest; Nachtest nicht bestanden → zurück", () => {
    let e = bisFunktionstest("faehrt-nicht-auf");
    e = weiter(antworte(e, "ja", "nein"), k);
    e = antworte(e, "nein"); // → Spannungsversorgung (Pflicht)
    const slot = aktiverLauf(e, variante)!.slot;
    e = bestaetigungUmschalten(e, slot, "spannungsversorgung", "haupt");
    e = antworte(e, "behoben");
    e = weiter(e, k);
    expect(e.schritt.typ).toBe("nachtest");
    expect(e.fehlerbildStatus["faehrt-nicht-auf"]).toBe("behoben");

    e = antworte(e, "nein"); // Nachtest: nicht betriebsbereit
    e = weiter(e, k);
    expect(e.schritt).toEqual({ typ: "diagnose", fehlerbild: "faehrt-nicht-auf", verfahren: "diagnose" });
    expect(e.fehlerbildStatus["faehrt-nicht-auf"]).toBe("offen");
    expect(e.laeufe[slot]).toBeUndefined();
    expect(Object.keys(e.bestaetigungen)).toEqual([]);
    expect(e.nachtestVersuche).toBe(1);
  });

  it("Fehlerbild ohne Ablauf → Eskalation, danach nächstes Fehlerbild", () => {
    let e = bisFunktionstest("geraeusche", "faehrt-nicht-auf");
    e = weiter(antworte(e, "ja", "nein"), k);
    expect(e.schritt).toMatchObject({ typ: "diagnose", fehlerbild: "geraeusche" });
    expect(aktiverLauf(e, variante)).toBeNull();
    expect(kannWeiter(e, k).ok).toBe(true);
    e = weiter(e, k);
    expect(e.fehlerbildStatus.geraeusche).toBe("eskaliert");
    expect(e.schritt).toMatchObject({ typ: "diagnose", fehlerbild: "faehrt-nicht-auf" });
  });

  it("nur Rückwärtsverfahren vorhanden → startet Step 3.2", () => {
    let e = bisFunktionstest("schliesst-nicht-vollstaendig");
    e = weiter(antworte(e, "ja", "nein"), k);
    expect(e.schritt).toMatchObject({ verfahren: "rueckwaerts" });
    expect(aktiverLauf(e, variante)?.flow.typ).toBe("rueckwaerts");
  });

  it("fragt nach bestandenem Nachtest übrige Fehlerbilder ab", () => {
    let e = bisFunktionstest("faehrt-nicht-auf", "schliesst-nicht-vollstaendig");
    e = weiter(antworte(e, "ja", "nein"), k);
    const slot = aktiverLauf(e, variante)!.slot;
    e = antworte(e, "nein");
    e = bestaetigungUmschalten(e, slot, "spannungsversorgung", "haupt");
    e = weiter(antworte(e, "behoben"), k); // → Nachtest
    e = weiter(antworte(e, "ja", "ja", "ja"), k);
    expect(e.schritt.typ).toBe("restfehler");
    expect(kannWeiter(e, k).ok).toBe(false);

    const besteht = fehlerbildDiagnostizieren(e, variante, "schliesst-nicht-vollstaendig");
    expect(besteht.schritt).toMatchObject({ typ: "diagnose", verfahren: "rueckwaerts" });

    e = fehlerbildNichtMehrVorhanden(e, "schliesst-nicht-vollstaendig");
    e = weiter(e, k);
    expect(e.schritt.typ).toBe("abmeldung");
  });

  it("bietet bei bestandenem Funktionstest „kein Fehler feststellbar“ an", () => {
    let e = bisFunktionstest("faehrt-nicht-auf");
    expect(() => keinFehlerFeststellbar(e, variante)).toThrow(EinsatzFehler);
    e = antworte(e, "ja", "ja", "ja");
    e = keinFehlerFeststellbar(e, variante);
    expect(e.schritt.typ).toBe("abmeldung");
    expect(e.ergebnis).toBe("kein-fehler");
  });

  it("kann bewusst als nicht erfolgreich beendet werden", () => {
    const e = nichtErfolgreichBeenden(bisFunktionstest("faehrt-nicht-auf"));
    expect(e.schritt.typ).toBe("abmeldung");
    expect(e.ergebnis).toBe("nicht-erfolgreich");
  });

  it("Zurück behält alle Eingaben", () => {
    let e = bisFunktionstest("faehrt-nicht-auf");
    e = antworte(e, "ja");
    e = schrittZurueck(e);
    expect(e.schritt.typ).toBe("aufnahme");
    expect(e.fehlerbilder).toEqual(["faehrt-nicht-auf"]);
    e = weiter(e, k);
    expect(e.laeufe.funktionstest).toHaveLength(1);
  });

  it("erzeugt beim erneuten Weiter keine doppelten Protokolleinträge", () => {
    let e = bisFunktionstest("faehrt-nicht-auf");
    e = weiter(antworte(e, "ja", "nein"), k);
    e = weiter(schrittZurueck(e), k);
    expect(e.protokoll).toHaveLength(1);
  });
});

describe("Lidl → Zigarettenträger → ITAB: 15-Sekunden-Modus", () => {
  const pfadItab = { ...pfad, variante: "itab" };
  const itab = repo.getVariante(pfadItab)!;
  const kItab: Kontext = { ...k, variante: itab };
  const antw = (e: Einsatz, ...ids: string[]) => ids.reduce((acc, id) => antworten(acc, itab, id), e);

  /** Fehlerbild wählen, allgemeiner Funktionstest „Nein“. */
  function bisDiagnose(): Einsatz {
    let e = neuerEinsatz(pfadItab);
    e = weiter(fehlerbildUmschalten(e, "15-sekunden-modus-nicht-aktiv"), kItab);
    expect(aktiverLauf(e, itab)?.flow.id).toBe("standard-funktionstest");
    return weiter(antw(e, "nein"), kItab);
  }

  it("Ja → in Ordnung, Fehlerbild erledigt, weiter zum Nachtest", () => {
    let e = bisDiagnose();
    expect(e.schritt).toMatchObject({ typ: "diagnose", fehlerbild: "15-sekunden-modus-nicht-aktiv" });
    e = weiter(antw(e, "ja"), kItab);
    expect(e.fehlerbildStatus["15-sekunden-modus-nicht-aktiv"]).toBe("nicht-mehr-vorhanden");
    expect(e.schritt.typ).toBe("nachtest");
  });

  it("Nein + Instore Communication verbaut → kein Fehler", () => {
    const e = antw(bisDiagnose(), "nein", "ja");
    expect(aktiverLauf(e, itab) && e.laeufe).toBeTruthy();
    expect(weiter(e, kItab).fehlerbildStatus["15-sekunden-modus-nicht-aktiv"]).toBe("nicht-mehr-vorhanden");
  });

  it("Nein + kein Instore Communication → DIP-Schalter → behoben bzw. Innendienst", () => {
    const e = antw(bisDiagnose(), "nein", "nein");
    const behoben = weiter(antw(e, "schliesst-jetzt"), kItab);
    expect(behoben.fehlerbildStatus["15-sekunden-modus-nicht-aktiv"]).toBe("behoben");
    const eskaliert = weiter(antw(e, "schliesst-weiterhin-nicht"), kItab);
    expect(eskaliert.fehlerbildStatus["15-sekunden-modus-nicht-aktiv"]).toBe("eskaliert");
  });
});

describe("Lidl → Zigarettenträger → ITAB: schließt nicht komplett", () => {
  const pfadItab = { ...pfad, variante: "itab" };
  const itab = repo.getVariante(pfadItab)!;
  const kItab: Kontext = { ...k, variante: itab };
  const antw = (e: Einsatz, ...ids: string[]) => ids.reduce((acc, id) => antworten(acc, itab, id), e);
  const fb = "schliesst-nicht-komplett";

  function bisDiagnose(): Einsatz {
    let e = neuerEinsatz(pfadItab);
    e = weiter(fehlerbildUmschalten(e, fb), kItab); // → Funktionstest
    return weiter(antw(e, "nein"), kItab);
  }
  const knotenNach = (e: Einsatz) => {
    const lauf = aktiverLauf(e, itab)!;
    return lauf.flow.knoten.find((x) => x.id === (stand(lauf.flow, e.laeufe[lauf.slot] ?? []).knoten.id))!.id;
  };

  it("Metallischer Kontakt → Position anpassen → behoben", () => {
    const e = antw(bisDiagnose(), "ja", "nein", "ja");
    expect(knotenNach(e)).toBe("position-anpassen");
    expect(weiter(antw(e, "schliesst-jetzt"), kItab).fehlerbildStatus[fb]).toBe("behoben");
  });

  it("Kein Magnet im Rollo → Magnet einsetzen", () => {
    expect(knotenNach(antw(bisDiagnose(), "ja", "nein", "nein", "nein"))).toBe("magnet-einsetzen");
  });

  it("Schraubenzieher-Test: Rollo stoppt → Position anpassen, fährt weiter → Magnetschalter tauschen", () => {
    const e = antw(bisDiagnose(), "ja", "nein", "nein", "ja");
    expect(knotenNach(antw(e, "rollo-stoppt"))).toBe("position-anpassen");
    expect(knotenNach(antw(e, "rollo-faehrt-weiter"))).toBe("magnetschalter-tauschen");
  });

  it("Nicht 10 cm offen bzw. Relais klickt → Innendienst", () => {
    expect(weiter(antw(bisDiagnose(), "nein"), kItab).fehlerbildStatus[fb]).toBe("eskaliert");
    expect(weiter(antw(bisDiagnose(), "ja", "ja"), kItab).fehlerbildStatus[fb]).toBe("eskaliert");
  });
});

describe("Direkteinstieg aus der Suche", () => {
  const itab = repo.getVariante({ ...pfad, variante: "itab" })!;
  const kItab: Kontext = { ...k, variante: itab };

  it("startet mit gewähltem Fehlerbild direkt beim Funktionstest", () => {
    const e = neuerEinsatzMitFehlerbild({ ...pfad, variante: "itab" }, kItab, "schliesst-nicht-komplett");
    expect(e.schritt.typ).toBe("funktionstest");
    expect(e.fehlerbilder).toEqual(["schliesst-nicht-komplett"]);
    expect(schrittZurueck(e).schritt.typ).toBe("aufnahme");
  });

  it("ignoriert unbekannte Fehlerbilder", () => {
    expect(neuerEinsatzMitFehlerbild({ ...pfad, variante: "itab" }, kItab, "gibt-es-nicht").schritt.typ).toBe("aufnahme");
  });
});
