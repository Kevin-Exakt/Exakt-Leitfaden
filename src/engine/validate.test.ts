import { describe, expect, it } from "vitest";
import { validateFlow } from "./validate";
import { baueFlow, diagnoseFlow } from "./testdaten";

const fehler = (flow: ReturnType<typeof baueFlow>) =>
  validateFlow(flow)
    .filter((p) => p.schwere === "fehler")
    .map((p) => p.meldung);

const basis = { typ: "diagnose", titel: "T", status: "entwurf", version: 1 } as const;

describe("Ablauf-Validierung", () => {
  it("akzeptiert einen korrekten Ablauf", () => {
    expect(validateFlow(diagnoseFlow())).toEqual([]);
  });

  it("findet Verweise auf unbekannte Knoten und fehlenden Start", () => {
    const flow = baueFlow({
      ...basis,
      start: "gibt-es-nicht",
      knoten: [
        { id: "a", art: "frage", titel: "A", antworten: [{ label: "Ja", typ: "ja", weiter: "fehlt" }] },
      ],
    });
    const m = fehler(flow);
    expect(m.some((x) => x.includes("Startknoten"))).toBe(true);
    expect(m.some((x) => x.includes('unbekannten Knoten "fehlt"'))).toBe(true);
  });

  it("findet Sackgassen (Knoten ohne Antworten)", () => {
    const flow = baueFlow({ ...basis, start: "a", knoten: [{ id: "a", art: "frage", titel: "A" }] });
    expect(fehler(flow).some((x) => x.includes("keine Antworten"))).toBe(true);
  });

  it("findet Endlosschleifen ohne Ausgang", () => {
    const flow = baueFlow({
      ...basis,
      start: "a",
      knoten: [
        { id: "a", art: "frage", titel: "A", antworten: [{ label: "Ja", typ: "ja", weiter: "b" }] },
        { id: "b", art: "frage", titel: "B", antworten: [{ label: "Ja", typ: "ja", weiter: "a" }] },
        { id: "ende", art: "ergebnis", ergebnis: "behoben", titel: "Ende" },
      ],
    });
    const m = fehler(flow);
    expect(m.filter((x) => x.includes("Endlosschleife")).length).toBe(2);
  });

  it("erlaubt Schleifen, solange ein Ausgang existiert", () => {
    const flow = baueFlow({
      ...basis,
      start: "a",
      knoten: [
        { id: "a", art: "frage", titel: "A", antworten: [{ label: "Nochmal", id: "nochmal", weiter: "b" }] },
        {
          id: "b",
          art: "frage",
          titel: "B",
          antworten: [
            { label: "Zurück zu A", id: "zurueck", weiter: "a" },
            { label: "Fertig", id: "fertig", weiter: "ende" },
          ],
        },
        { id: "ende", art: "ergebnis", ergebnis: "behoben", titel: "Ende" },
      ],
    });
    expect(fehler(flow)).toEqual([]);
  });

  it("meldet unerreichbare Knoten als Warnung", () => {
    const flow = baueFlow({
      ...basis,
      start: "ende",
      knoten: [
        { id: "ende", art: "ergebnis", ergebnis: "behoben", titel: "Ende" },
        { id: "waise", art: "ergebnis", ergebnis: "behoben", titel: "Waise" },
      ],
    });
    const p = validateFlow(flow);
    expect(p).toHaveLength(1);
    expect(p[0].schwere).toBe("warnung");
  });

  it("prüft erlaubte Ergebnisse je Ablauftyp", () => {
    const flow = baueFlow({
      ...basis,
      typ: "funktionstest",
      start: "ende",
      knoten: [{ id: "ende", art: "ergebnis", ergebnis: "reparatur", reparatur: "x", titel: "Ende" }],
    });
    expect(fehler(flow).some((x) => x.includes("nicht erlaubt"))).toBe(true);
  });

  it("verlangt bei Reparatur-Ergebnis einen Leitfaden", () => {
    const flow = baueFlow({
      ...basis,
      start: "ende",
      knoten: [{ id: "ende", art: "ergebnis", ergebnis: "reparatur", titel: "Ende" }],
    });
    expect(fehler(flow).some((x) => x.includes("Reparaturleitfadens"))).toBe(true);
  });

  it("verlangt Pflichtbestätigung bei Sicherheitshinweisen", () => {
    const flow = baueFlow({
      ...basis,
      start: "a",
      knoten: [
        {
          id: "a",
          art: "anweisung",
          titel: "A",
          inhalt: [{ typ: "sicherheit", text: "Gefahr" }],
          antworten: [{ label: "Weiter", id: "weiter", weiter: "ende" }],
        },
        { id: "ende", art: "ergebnis", ergebnis: "behoben", titel: "Ende" },
      ],
    });
    expect(fehler(flow).some((x) => x.includes("Pflichtbestätigung"))).toBe(true);
  });

  it("findet doppelte Antwort-IDs", () => {
    const flow = baueFlow({
      ...basis,
      start: "a",
      knoten: [
        {
          id: "a",
          art: "frage",
          titel: "A",
          antworten: [
            { label: "Ja", typ: "ja", weiter: "ende" },
            { label: "Ja, sicher", typ: "ja", weiter: "ende" },
          ],
        },
        { id: "ende", art: "ergebnis", ergebnis: "behoben", titel: "Ende" },
      ],
    });
    expect(fehler(flow).some((x) => x.includes("doppelt"))).toBe(true);
  });
});
