/**
 * Liest alle Inhalte aus dem Ordner `content/` und baut daraus den Inhaltsbaum.
 *
 * Ordnerstruktur (IDs = Ordner-/Dateinamen):
 *
 *   content/hersteller.yaml
 *   content/<kunde>/kunde.yaml
 *   content/<kunde>/<bereich>/bereich.yaml
 *   content/<kunde>/<bereich>/<system>/system.yaml
 *   content/<kunde>/<bereich>/<system>/<variante>/variante.yaml
 *   content/<kunde>/<bereich>/<system>/<variante>/vorbereitung.yaml
 *   content/<kunde>/<bereich>/<system>/<variante>/<unterordner>/<ablauf>.yaml   (beliebige Unterordner)
 *
 * Fehler werden gesammelt statt sofort abzubrechen, damit man alle Probleme auf einmal sieht.
 * Nur serverseitig verwenden (Dateisystem).
 */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import {
  BereichDateiSchema,
  type ContentTree,
  type Flow,
  FlowDateiSchema,
  HerstellerDateiSchema,
  IdSchema,
  KundeDateiSchema,
  SystemDateiSchema,
  type Variante,
  VarianteDateiSchema,
  VorbereitungDateiSchema,
} from "./schema";
import type { Problem } from "../engine/validate";

export type LadeErgebnis = { tree: ContentTree; probleme: Problem[] };

export function loadContent(contentDir: string): LadeErgebnis {
  const probleme: Problem[] = [];
  const rel = (p: string) => path.relative(contentDir, p).replaceAll("\\", "/");

  function lies<S extends z.ZodType>(datei: string, schema: S): z.infer<S> | null {
    if (!fs.existsSync(datei)) {
      probleme.push({ schwere: "fehler", ort: rel(datei), meldung: "Datei fehlt." });
      return null;
    }
    let roh: unknown;
    try {
      roh = parseYaml(fs.readFileSync(datei, "utf8"));
    } catch (e) {
      probleme.push({ schwere: "fehler", ort: rel(datei), meldung: `YAML-Syntaxfehler: ${(e as Error).message}` });
      return null;
    }
    const ergebnis = schema.safeParse(roh);
    if (!ergebnis.success) {
      for (const issue of ergebnis.error.issues)
        probleme.push({
          schwere: "fehler",
          ort: `${rel(datei)}${issue.path.length ? ` › ${issue.path.join(".")}` : ""}`,
          meldung: issue.message,
        });
      return null;
    }
    return ergebnis.data;
  }

  function ordner(dir: string): string[] {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_"))
      .map((e) => e.name)
      .sort()
      .filter((name) => {
        const ok = IdSchema.safeParse(name).success;
        if (!ok)
          probleme.push({
            schwere: "fehler",
            ort: rel(path.join(dir, name)),
            meldung: "Ordnername ist keine gültige ID (nur a–z, 0–9, Bindestriche).",
          });
        return ok;
      });
  }

  function yamlDateienRekursiv(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return yamlDateienRekursiv(p);
      return e.name.endsWith(".yaml") ? [p] : [];
    });
  }

  function ladeVariante(dir: string, id: string): Variante | null {
    const meta = lies(path.join(dir, "variante.yaml"), VarianteDateiSchema);
    const vorbereitung = lies(path.join(dir, "vorbereitung.yaml"), VorbereitungDateiSchema);
    const flows: Record<string, Flow> = {};
    for (const unter of fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      for (const datei of yamlDateienRekursiv(path.join(dir, unter.name))) {
        const flowId = path.basename(datei, ".yaml");
        if (!IdSchema.safeParse(flowId).success) {
          probleme.push({ schwere: "fehler", ort: rel(datei), meldung: "Dateiname ist keine gültige ID." });
          continue;
        }
        if (flows[flowId]) {
          probleme.push({ schwere: "fehler", ort: rel(datei), meldung: `Ablauf-ID "${flowId}" gibt es in dieser Variante schon.` });
          continue;
        }
        const flow = lies(datei, FlowDateiSchema);
        if (flow) flows[flowId] = { ...flow, id: flowId, quelle: rel(datei) };
      }
    }
    if (!meta || !vorbereitung) return null;
    return { ...meta, id, vorbereitung, flows };
  }

  const hersteller = lies(path.join(contentDir, "hersteller.yaml"), HerstellerDateiSchema)?.hersteller ?? [];

  const kunden: ContentTree["kunden"] = [];
  for (const kundeId of ordner(contentDir)) {
    const kDir = path.join(contentDir, kundeId);
    const kunde = lies(path.join(kDir, "kunde.yaml"), KundeDateiSchema);
    const bereiche = [];
    for (const bereichId of ordner(kDir)) {
      const bDir = path.join(kDir, bereichId);
      const bereich = lies(path.join(bDir, "bereich.yaml"), BereichDateiSchema);
      const systeme = [];
      for (const systemId of ordner(bDir)) {
        const sDir = path.join(bDir, systemId);
        const system = lies(path.join(sDir, "system.yaml"), SystemDateiSchema);
        const varianten = ordner(sDir)
          .map((vId) => ladeVariante(path.join(sDir, vId), vId))
          .filter((v): v is Variante => v !== null);
        if (system) systeme.push({ ...system, id: systemId, varianten });
      }
      if (bereich) bereiche.push({ ...bereich, id: bereichId, systeme });
    }
    if (kunde) kunden.push({ ...kunde, id: kundeId, bereiche });
  }

  return { tree: { hersteller, kunden }, probleme };
}
