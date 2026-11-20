/**
 * Baut den Suchindex aus dem Inhaltsbaum (serverseitig). Klein genug, um ihn
 * komplett an den Browser zu geben.
 */
import type { ContentTree } from "./schema";
import { type SuchEintrag, woerter } from "../suche/suche";

export function baueSuchindex(tree: ContentTree): SuchEintrag[] {
  const herstellerName = new Map(tree.hersteller.map((h) => [h.id, h.name]));
  const eintraege: SuchEintrag[] = [];

  for (const a of tree.auftraggeber)
    for (const k of a.kunden) {
      const einKunde = a.kunden.length === 1;
      const pfadName = einKunde ? a.name : `${a.name} · ${k.name}`;
      for (const s of k.systeme) {
        const basisWoerter = [a.name, einKunde ? undefined : k.name, s.name, ...s.kuerzel];

        if (s.varianten.length === 0) {
          eintraege.push({
            art: "system",
            titel: s.name,
            unterzeile: pfadName,
            href: `/${a.id}/${k.id}/${s.id}`,
            woerter: woerter(...basisWoerter),
          });
          continue;
        }

        for (const v of s.varianten) {
          const hName = v.name ?? (v.hersteller ? herstellerName.get(v.hersteller) : undefined);
          const titel = [s.name, hName].filter(Boolean).join(" · ");
          const href = `/${a.id}/${k.id}/${s.id}/${v.id}`;
          const variantenWoerter = [...basisWoerter, hName];

          eintraege.push({ art: "system", titel, unterzeile: pfadName, href, woerter: woerter(...variantenWoerter) });

          for (const fb of v.fehlerbilder)
            eintraege.push({
              art: "fehlerbild",
              titel: fb.titel,
              unterzeile: `${pfadName} · ${titel}`,
              href: `${href}?fehlerbild=${encodeURIComponent(fb.id)}`,
              woerter: woerter(...variantenWoerter, fb.titel),
            });
        }
      }
    }
  return eintraege;
}
