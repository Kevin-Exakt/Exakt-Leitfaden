/** Kleine Test-Abläufe für die Engine-Tests. */
import { FlowDateiSchema, type Flow } from "../content/schema";

export function baueFlow(roh: unknown, id = "test"): Flow {
  return { ...FlowDateiSchema.parse(roh), id };
}

/** Steuereinheit → Motor → Ergebnis, mit Pflichtbestätigung bei der Spannungsprüfung. */
export const diagnoseFlow = () =>
  baueFlow({
    typ: "diagnose",
    titel: "Fährt nicht auf",
    status: "entwurf",
    version: 1,
    start: "strom",
    knoten: [
      {
        id: "strom",
        art: "frage",
        titel: "Hat die Steuereinheit Strom?",
        antworten: [
          { label: "Ja", typ: "ja", weiter: "motor" },
          { label: "Nein", typ: "nein", weiter: "spannung" },
          { label: "Prüfung nicht möglich", typ: "nicht-moeglich", weiter: "eskalation" },
        ],
      },
      {
        id: "spannung",
        art: "anweisung",
        titel: "Spannungsversorgung prüfen",
        pflicht: { text: "Sicherheitsvorgaben eingehalten" },
        antworten: [{ label: "Erledigt", id: "erledigt", weiter: "motor" }],
      },
      {
        id: "motor",
        art: "frage",
        titel: "Dreht der Motor?",
        antworten: [
          { label: "Ja", typ: "ja", weiter: "behoben" },
          { label: "Nein", typ: "nein", weiter: "tauschen" },
        ],
      },
      { id: "behoben", art: "ergebnis", ergebnis: "behoben", titel: "Behoben" },
      { id: "tauschen", art: "ergebnis", ergebnis: "reparatur", reparatur: "motor-tauschen", titel: "Motor tauschen" },
      { id: "eskalation", art: "ergebnis", ergebnis: "eskalation", titel: "Innendienst kontaktieren" },
    ],
  });
