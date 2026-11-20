/**
 * Prüft alle Inhalte unter content/.
 *   npm run validate
 * Läuft automatisch vor jedem Build und in GitHub Actions.
 * Beendet sich mit Code 1, wenn Fehler gefunden werden (Warnungen blockieren nicht).
 */
import fs from "node:fs";
import path from "node:path";
import { loadContent } from "../src/content/load";
import { validateContent } from "../src/content/validate-content";

const root = process.cwd();
const { tree, probleme: ladeProbleme } = loadContent(path.join(root, "content"));
const probleme = [
  ...ladeProbleme,
  ...validateContent(tree, {
    medienExistiert: (src) => fs.existsSync(path.join(root, "public", src)),
  }),
];

const fehler = probleme.filter((p) => p.schwere === "fehler");
const warnungen = probleme.filter((p) => p.schwere === "warnung");

for (const p of fehler) console.error(`✖ FEHLER   ${p.ort}\n           ${p.meldung}`);
for (const p of warnungen) console.warn(`⚠ WARNUNG  ${p.ort}\n           ${p.meldung}`);

const anzahlFlows = tree.auftraggeber
  .flatMap((k) => k.kunden)
  .flatMap((b) => b.systeme)
  .flatMap((s) => s.varianten)
  .reduce((n, v) => n + Object.keys(v.flows).length, 0);

console.log(
  `\nInhalte geprüft: ${tree.auftraggeber.length} Auftraggeber, ${anzahlFlows} Abläufe – ` +
    `${fehler.length} Fehler, ${warnungen.length} Warnungen.`,
);
process.exit(fehler.length ? 1 : 0);
