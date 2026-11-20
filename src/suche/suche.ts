/**
 * Schnellsuche über Auftraggeber, Kunden, Systeme, Hersteller und Fehlerbilder.
 * Reines TypeScript – läuft im Browser, keine Abhängigkeiten.
 *
 * Regeln: Jedes Wort der Eingabe muss am Anfang eines Wortes im Eintrag stehen
 * („schl“ findet „schließt“). Groß-/Kleinschreibung und Umlaute egal.
 */

export type SuchEintrag = {
  art: "fehlerbild" | "system";
  titel: string;
  /** z. B. „Pan Oston · Lidl · Zigarettenträger ITAB“ */
  unterzeile: string;
  href: string;
  /** Normalisierte Suchwörter (Namen, Kürzel …). */
  woerter: string[];
};

export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function woerter(...texte: (string | undefined)[]): string[] {
  return texte
    .filter((t): t is string => Boolean(t))
    .flatMap((t) => normalisiere(t).split(/[^a-z0-9]+/))
    .filter(Boolean);
}

/** Liefert passende Einträge, beste zuerst. Leere Eingabe → keine Treffer. */
export function suche(index: SuchEintrag[], eingabe: string, max = 8): SuchEintrag[] {
  const begriffe = woerter(eingabe);
  if (!begriffe.length) return [];

  const treffer: { e: SuchEintrag; punkte: number }[] = [];
  for (const e of index) {
    let punkte = 0;
    let alle = true;
    for (const b of begriffe) {
      const exakt = e.woerter.includes(b);
      if (exakt) punkte += 2;
      else if (e.woerter.some((w) => w.startsWith(b))) punkte += 1;
      else {
        alle = false;
        break;
      }
    }
    if (!alle) continue;
    // Fehlerbilder sind das eigentliche Ziel → leicht bevorzugen; kürzere Einträge passen genauer
    if (e.art === "fehlerbild") punkte += 0.5;
    punkte -= e.woerter.length * 0.01;
    treffer.push({ e, punkte });
  }
  return treffer
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, max)
    .map((t) => t.e);
}
