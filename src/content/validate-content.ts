/**
 * Prüft den gesamten Inhaltsbaum: jeden Ablauf einzeln (Engine-Regeln)
 * und alle Verweise zwischen Dateien (Fehlerbild → Diagnose, Ergebnis → Reparatur …).
 */
import type { Block, ContentTree, Flow, FlowTyp, Variante } from "./schema";
import { type Problem, validateFlow } from "../engine/validate";

export type ValidierungsOptionen = {
  /** Prüft, ob eine Mediendatei (z. B. "/medien/demo/bild.svg") existiert. */
  medienExistiert?: (src: string) => boolean;
};

export function validateContent(tree: ContentTree, optionen: ValidierungsOptionen = {}): Problem[] {
  const probleme: Problem[] = [];
  const herstellerIds = new Set(tree.hersteller.map((h) => h.id));

  const pruefeBloecke = (bloecke: Block[], ort: string) => {
    if (!optionen.medienExistiert) return;
    for (const b of bloecke)
      if ((b.typ === "bild" || b.typ === "video" || b.typ === "pdf") && b.src.startsWith("/medien/"))
        if (!optionen.medienExistiert(b.src))
          probleme.push({ schwere: "fehler", ort, meldung: `Mediendatei "public${b.src}" fehlt.` });
  };

  for (const auftraggeber of tree.auftraggeber) {
    pruefeBloecke(auftraggeber.ankunft.hinweise, `${auftraggeber.id}/auftraggeber.yaml`);
    for (const kunde of auftraggeber.kunden) {
      if (kunde.ankunft) pruefeBloecke(kunde.ankunft.hinweise, `${auftraggeber.id}/${kunde.id}/kunde.yaml`);
      for (const system of kunde.systeme)
        for (const variante of system.varianten) {
          const basis = `${auftraggeber.id}/${kunde.id}/${system.id}/${variante.id}`;
          if (variante.hersteller && !herstellerIds.has(variante.hersteller))
            probleme.push({
              schwere: "fehler",
              ort: `${basis}/variante.yaml`,
              meldung: `Hersteller "${variante.hersteller}" fehlt in content/hersteller.yaml.`,
            });
          probleme.push(...validateVariante(variante, basis, pruefeBloecke));
        }
    }
  }
  return probleme;
}

function validateVariante(
  v: Variante,
  basis: string,
  pruefeBloecke: (b: Block[], ort: string) => void,
): Problem[] {
  const probleme: Problem[] = [];
  const fehler = (ort: string, meldung: string) => probleme.push({ schwere: "fehler", ort, meldung });

  const verweis = (ort: string, feld: string, id: string | undefined, typ: FlowTyp) => {
    if (!id) return;
    const flow: Flow | undefined = v.flows[id];
    if (!flow) fehler(ort, `${feld}: Ablauf "${id}" existiert nicht.`);
    else if (flow.typ !== typ) fehler(ort, `${feld}: "${id}" ist vom Typ "${flow.typ}", erwartet "${typ}".`);
  };

  const varianteOrt = `${basis}/variante.yaml`;
  verweis(varianteOrt, "funktionstest", v.funktionstest, "funktionstest");
  if (v.fehlerbilder.length > 0 && !v.funktionstest)
    probleme.push({
      schwere: "warnung",
      ort: varianteOrt,
      meldung: "Leitfaden in Arbeit: Fehlerbilder sind angelegt, aber noch kein \"funktionstest\" – die App zeigt „Leitfaden folgt“.",
    });
  verweis(varianteOrt, "nachtest", v.nachtest, "funktionstest");

  const fehlerbildIds = new Set<string>();
  for (const fb of v.fehlerbilder) {
    const ort = `${varianteOrt} › Fehlerbild "${fb.id}"`;
    if (fehlerbildIds.has(fb.id)) fehler(ort, "Fehlerbild-ID ist doppelt.");
    fehlerbildIds.add(fb.id);
    verweis(ort, "diagnose", fb.diagnose, "diagnose");
    verweis(ort, "rueckwaerts", fb.rueckwaerts, "rueckwaerts");
  }

  // Vorbereitung: eindeutige IDs über alle Listen
  const vb = v.vorbereitung;
  const vorbereitungsIds = new Set<string>();
  for (const e of [...vb.werkzeug, ...vb.messgeraete, ...vb.material, ...vb.ersatzteile, ...vb.dokumente]) {
    if (vorbereitungsIds.has(e.id)) fehler(`${basis}/vorbereitung.yaml`, `ID "${e.id}" ist doppelt vergeben.`);
    vorbereitungsIds.add(e.id);
  }
  pruefeBloecke(vb.hinweise, `${basis}/vorbereitung.yaml`);

  for (const flow of Object.values(v.flows)) {
    const ort = flow.quelle ?? `${basis} › Ablauf "${flow.id}"`;
    probleme.push(...validateFlow(flow, ort));
    pruefeBloecke(flow.hinweise, ort);

    for (const id of flow.benoetigt)
      if (!vorbereitungsIds.has(id)) fehler(ort, `benoetigt: "${id}" steht nicht in vorbereitung.yaml.`);

    for (const k of flow.knoten) {
      const kOrt = `${ort} › Knoten "${k.id}"`;
      pruefeBloecke(k.inhalt, kOrt);
      for (const id of k.benoetigt)
        if (!vorbereitungsIds.has(id)) fehler(kOrt, `benoetigt: "${id}" steht nicht in vorbereitung.yaml.`);
      if (k.ergebnis === "reparatur") verweis(kOrt, "reparatur", k.reparatur, "reparatur");
    }
  }

  // Hinweis auf Abläufe, die nirgends verwendet werden
  const verwendet = new Set<string>([v.funktionstest ?? "", v.nachtest ?? ""]);
  for (const fb of v.fehlerbilder) [fb.diagnose, fb.rueckwaerts].forEach((id) => id && verwendet.add(id));
  for (const flow of Object.values(v.flows))
    for (const k of flow.knoten) if (k.reparatur) verwendet.add(k.reparatur);
  for (const flow of Object.values(v.flows))
    if (!verwendet.has(flow.id))
      probleme.push({
        schwere: "warnung",
        ort: flow.quelle ?? flow.id,
        meldung: "Ablauf wird von keinem Fehlerbild, Funktionstest oder Ergebnis verwendet.",
      });

  return probleme;
}
