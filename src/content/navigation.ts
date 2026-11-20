/**
 * Hilfsfunktionen für Seiten: statische Pfade und lesbare Namen.
 * Nur serverseitig verwenden.
 */
import { getRepository } from "./repository";

export function alleVarianten() {
  const repo = getRepository();
  return repo.getAlleAuftraggeber().flatMap((k) =>
    k.kunden.flatMap((b) =>
      b.systeme.flatMap((s) =>
        s.varianten.map((v) => ({
          auftraggeber: k.id,
          kunde: b.id,
          system: s.id,
          variante: v.id,
          auftraggeberName: k.name,
          kundeName: b.name,
          systemName: s.name,
          herstellerName: v.name ?? repo.getHersteller(v.hersteller)?.name ?? v.hersteller,
          /** Ankunftsvorgaben: Kunde (z. B. Lidl) vor Auftraggeber. */
          ankunft: b.ankunft ?? k.ankunft,
          v,
        })),
      ),
    ),
  );
}

export function variantenParams() {
  return alleVarianten().map(({ auftraggeber, kunde, system, variante }) => ({ auftraggeber, kunde, system, variante }));
}

export function auftraggeberParams() {
  return getRepository()
    .getAlleAuftraggeber()
    .map((k) => ({ auftraggeber: k.id }));
}

export function kundenParams() {
  return getRepository()
    .getAlleAuftraggeber()
    .flatMap((a) => a.kunden.map((k) => ({ auftraggeber: a.id, kunde: k.id })));
}

/** Auftraggeber + Kunde für Seiten; undefined, wenn es die Kombination nicht gibt. */
export function findeKunde(auftraggeberId: string, kundeId: string) {
  const auftraggeber = getRepository().getAuftraggeber(auftraggeberId);
  const kunde = auftraggeber?.kunden.find((k) => k.id === kundeId);
  return auftraggeber && kunde ? { auftraggeber, kunde } : undefined;
}

/** "kunde/system/variante" → "Zigarettenträger · NERA" */
export function variantenNamen(auftraggeber: string): Record<string, string> {
  return Object.fromEntries(
    alleVarianten()
      .filter((x) => x.auftraggeber === auftraggeber)
      .map((x) => [`${x.kunde}/${x.system}/${x.variante}`, `${x.systemName} · ${x.herstellerName}`]),
  );
}
