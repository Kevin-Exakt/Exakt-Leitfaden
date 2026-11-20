/**
 * Allgemeiner Funktionstest – wird verwendet, solange für eine Variante noch kein
 * systemspezifischer Funktionstest hinterlegt ist (Step 3 und Step 5).
 * Enthält bewusst keine technischen Prüfanweisungen.
 */
import type { Antwort, Flow, Knoten } from "../content/schema";

const antwort = (label: string, typ: Antwort["typ"], weiter: string, id?: string): Antwort => ({
  id: id ?? typ,
  label,
  typ,
  weiter,
});

const knoten = (k: Partial<Knoten> & Pick<Knoten, "id" | "art" | "titel">): Knoten => ({
  inhalt: [],
  benoetigt: [],
  antworten: [],
  ...k,
});

export const STANDARD_FUNKTIONSTEST: Flow = {
  id: "standard-funktionstest",
  typ: "funktionstest",
  titel: "Funktionstest",
  status: "entwurf",
  version: 1,
  start: "funktion",
  benoetigt: [],
  hinweise: [
    {
      typ: "hinweis",
      titel: "Allgemeiner Funktionstest",
      text: "Für dieses System ist noch kein eigener Funktionstest hinterlegt. System komplett durchfahren und das Verhalten beobachten.",
    },
  ],
  knoten: [
    knoten({
      id: "funktion",
      art: "frage",
      titel: "Funktioniert das System einwandfrei?",
      antworten: [
        antwort("Ja", "ja", "bestanden"),
        antwort("Teilweise", "sonstige", "teilweise", "teilweise"),
        antwort("Nein", "nein", "nicht-bestanden"),
      ],
    }),
    knoten({ id: "bestanden", art: "ergebnis", ergebnis: "bestanden", titel: "Funktionstest bestanden" }),
    knoten({ id: "teilweise", art: "ergebnis", ergebnis: "teilweise", titel: "Funktion nur teilweise gegeben" }),
    knoten({ id: "nicht-bestanden", art: "ergebnis", ergebnis: "nicht-bestanden", titel: "Funktionstest nicht bestanden" }),
  ],
};
