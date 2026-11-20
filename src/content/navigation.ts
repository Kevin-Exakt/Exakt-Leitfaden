/**
 * Hilfsfunktionen für Seiten: statische Pfade und lesbare Namen.
 * Nur serverseitig verwenden.
 */
import { getRepository } from "./repository";

export function alleVarianten() {
  const repo = getRepository();
  return repo.getKunden().flatMap((k) =>
    k.bereiche.flatMap((b) =>
      b.systeme.flatMap((s) =>
        s.varianten.map((v) => ({
          kunde: k.id,
          bereich: b.id,
          system: s.id,
          variante: v.id,
          kundeName: k.name,
          bereichName: b.name,
          systemName: s.name,
          herstellerName: repo.getHersteller(v.hersteller)?.name ?? v.hersteller,
          v,
        })),
      ),
    ),
  );
}

export function variantenParams() {
  return alleVarianten().map(({ kunde, bereich, system, variante }) => ({ kunde, bereich, system, variante }));
}

export function kundenParams() {
  return getRepository()
    .getKunden()
    .map((k) => ({ kunde: k.id }));
}

/** "bereich/system/variante" → "Zigarettenträger · NERA" */
export function variantenNamen(kunde: string): Record<string, string> {
  return Object.fromEntries(
    alleVarianten()
      .filter((x) => x.kunde === kunde)
      .map((x) => [`${x.bereich}/${x.system}/${x.variante}`, `${x.systemName} · ${x.herstellerName}`]),
  );
}
