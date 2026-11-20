import { describe, expect, it } from "vitest";
import { antworten, EngineFehler, korrigieren, pfad, stand, zurueck, zusammenfassung } from "./run";
import { diagnoseFlow } from "./testdaten";

describe("Diagnose-Engine", () => {
  const flow = diagnoseFlow();

  it("beginnt beim Startknoten", () => {
    const s = stand(flow);
    expect(s.knoten.id).toBe("strom");
    expect(s.beendet).toBe(false);
    expect(s.verlauf).toEqual([]);
  });

  it("verzweigt abhängig von der Antwort", () => {
    expect(stand(flow, antworten(flow, [], "ja")).knoten.id).toBe("motor");
    expect(stand(flow, antworten(flow, [], "nein")).knoten.id).toBe("spannung");
    expect(stand(flow, antworten(flow, [], "nicht-moeglich")).knoten.id).toBe("eskalation");
  });

  it("erkennt das Ende eines Ablaufs mit Ergebnis", () => {
    let v = antworten(flow, [], "ja");
    v = antworten(flow, v, "nein");
    const s = stand(flow, v);
    expect(s.beendet).toBe(true);
    expect(s.knoten.ergebnis).toBe("reparatur");
    expect(s.knoten.reparatur).toBe("motor-tauschen");
    expect(() => antworten(flow, v, "ja")).toThrow(EngineFehler);
  });

  it("verlangt die Pflichtbestätigung", () => {
    const v = antworten(flow, [], "nein");
    expect(() => antworten(flow, v, "erledigt")).toThrow(/Pflichtbestätigung/);
    const weiter = antworten(flow, v, "erledigt", { bestaetigt: true });
    expect(stand(flow, weiter).knoten.id).toBe("motor");
  });

  it("lehnt unbekannte Antworten ab", () => {
    expect(() => antworten(flow, [], "vielleicht")).toThrow(EngineFehler);
  });

  it("geht mit zurueck einen Schritt zurück", () => {
    const v = antworten(flow, antworten(flow, [], "ja"), "ja");
    expect(stand(flow, zurueck(v)).knoten.id).toBe("motor");
    expect(stand(flow, zurueck(zurueck(v))).knoten.id).toBe("strom");
    expect(zurueck([])).toEqual([]);
  });

  it("korrigiert eine frühere Antwort und verwirft den Rest", () => {
    let v = antworten(flow, [], "ja"); // strom: ja → motor
    v = antworten(flow, v, "ja"); // motor: ja → behoben
    const korrigiert = antworten(flow, korrigieren(v, 0), "nein"); // strom: nein → spannung
    expect(korrigiert).toEqual([{ knoten: "strom", antwort: "nein" }]);
    expect(stand(flow, korrigiert).knoten.id).toBe("spannung");
  });

  it("kürzt einen Verlauf, der nicht mehr zum Inhalt passt", () => {
    const veraltet = [
      { knoten: "strom", antwort: "ja" },
      { knoten: "motor", antwort: "gibt-es-nicht-mehr" },
      { knoten: "x", antwort: "y" },
    ];
    const s = stand(flow, veraltet);
    expect(s.gekuerzt).toBe(true);
    expect(s.knoten.id).toBe("motor");
    expect(s.verlauf).toEqual([{ knoten: "strom", antwort: "ja" }]);
  });

  it("liefert Pfad und Zusammenfassung für den Innendienst", () => {
    const v = antworten(flow, antworten(flow, [], "ja"), "nein");
    expect(pfad(flow, v).map((p) => `${p.knoten.id}:${p.antwort.label}`)).toEqual(["strom:Ja", "motor:Nein"]);
    expect(zusammenfassung(flow, v)).toBe(
      "Fährt nicht auf: Hat die Steuereinheit Strom? → Ja › Dreht der Motor? → Nein ⇒ Motor tauschen",
    );
    expect(zusammenfassung(flow, [])).toContain("noch keine Antwort");
  });
});
