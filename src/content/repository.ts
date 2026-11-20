/**
 * Zugriff auf Inhalte – die einzige Stelle, über die Seiten Inhalte lesen.
 *
 * Heute liest sie aus `content/` (Dateien). Wird später auf eine Datenbank
 * umgestellt, ändert sich nur die Implementierung dieser Schnittstelle,
 * nicht die Oberfläche.
 */
import path from "node:path";
import { loadContent } from "./load";
import type { ContentTree, Flow, Hersteller, Kunde, Variante } from "./schema";

export type VariantenPfad = {
  kunde: string;
  bereich: string;
  system: string;
  variante: string;
};

export interface ContentRepository {
  getKunden(): Kunde[];
  getKunde(id: string): Kunde | undefined;
  getHersteller(id: string): Hersteller | undefined;
  getVariante(pfad: VariantenPfad): Variante | undefined;
  getFlow(pfad: VariantenPfad, flowId: string): Flow | undefined;
}

export function createRepository(tree: ContentTree): ContentRepository {
  const getKunde = (id: string) => tree.kunden.find((k) => k.id === id);
  const getVariante = (p: VariantenPfad) =>
    getKunde(p.kunde)
      ?.bereiche.find((b) => b.id === p.bereich)
      ?.systeme.find((s) => s.id === p.system)
      ?.varianten.find((v) => v.id === p.variante);

  return {
    getKunden: () => tree.kunden.filter((k) => k.aktiv),
    getKunde,
    getHersteller: (id) => tree.hersteller.find((h) => h.id === id),
    getVariante,
    getFlow: (p, flowId) => getVariante(p)?.flows[flowId],
  };
}

let cache: ContentRepository | undefined;

/**
 * Repository auf Basis von `content/`. Inhalte werden einmal pro Serverprozess geladen.
 * Fehlerhafte Inhalte werden schon beim Build durch `npm run validate` abgefangen.
 */
export function getRepository(): ContentRepository {
  if (!cache || process.env.NODE_ENV === "development") {
    const { tree } = loadContent(path.join(process.cwd(), "content"));
    cache = createRepository(tree);
  }
  return cache;
}
