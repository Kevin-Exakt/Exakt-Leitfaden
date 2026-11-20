/**
 * Verbindliche Datenstruktur aller Fachinhalte.
 *
 * Jede YAML-Datei unter `content/` wird gegen diese Schemas geprüft.
 * Änderungen hier betreffen Engine, Technikeransicht und Innendienst –
 * daher immer im Team absprechen (siehe CLAUDE.md).
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Grundbausteine                                                      */
/* ------------------------------------------------------------------ */

/** Kleinbuchstaben, Ziffern, Bindestriche – z. B. "pruef-motor-dreht". */
export const IdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ID nur aus a–z, 0–9 und Bindestrichen (z. B. pruef-motor)");

/** Freigabestatus. Nur „freigegeben“ wird ohne Demo-Hinweis angezeigt. */
export const StatusSchema = z.enum(["entwurf", "freigegeben"]);

const FreigabeSchema = z.strictObject({
  von: z.string().min(1),
  am: z.iso.date(),
});

/** Pfad zu einer Datei in `public/`, z. B. "/medien/demo/platzhalter.svg". */
const MedienPfadSchema = z.string().regex(/^\/medien\//, "Medienpfad muss mit /medien/ beginnen");

/* ------------------------------------------------------------------ */
/* Inhaltsblöcke (Text, Warnung, Bild …)                               */
/* ------------------------------------------------------------------ */

export const BlockSchema = z.discriminatedUnion("typ", [
  z.strictObject({ typ: z.literal("text"), text: z.string().min(1) }),
  z.strictObject({ typ: z.literal("hinweis"), titel: z.string().optional(), text: z.string().min(1) }),
  z.strictObject({ typ: z.literal("warnung"), titel: z.string().optional(), text: z.string().min(1) }),
  z.strictObject({ typ: z.literal("sicherheit"), titel: z.string().optional(), text: z.string().min(1) }),
  z.strictObject({
    typ: z.literal("bild"),
    src: MedienPfadSchema,
    alt: z.string().min(1),
    beschriftung: z.string().optional(),
    /** Beispielbild – wird in der App als „Beispiel“ gekennzeichnet. */
    beispiel: z.boolean().default(true),
  }),
  z.strictObject({
    typ: z.literal("video"),
    titel: z.string().min(1),
    src: z.union([MedienPfadSchema, z.url()]),
  }),
  z.strictObject({
    typ: z.literal("pdf"),
    titel: z.string().min(1),
    src: z.union([MedienPfadSchema, z.url()]),
  }),
  z.strictObject({
    typ: z.literal("sollwert"),
    bezeichnung: z.string().min(1),
    wert: z.string().min(1),
    einheit: z.string().optional(),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;

/** Eintrag einer Liste (Werkzeug, Material, Ersatzteil …). */
export const ListenEintragSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  menge: z.string().optional(),
  hinweis: z.string().optional(),
  /** Muss abgehakt werden, bevor es weitergeht. */
  pflicht: z.boolean().default(true),
});
export type ListenEintrag = z.infer<typeof ListenEintragSchema>;

/* ------------------------------------------------------------------ */
/* Abläufe: Funktionstest, Diagnose, Rückwärtsverfahren, Reparatur     */
/* ------------------------------------------------------------------ */

export const FlowTypSchema = z.enum(["funktionstest", "diagnose", "rueckwaerts", "reparatur"]);
export type FlowTyp = z.infer<typeof FlowTypSchema>;

/**
 * Mögliche Ergebnisse am Ende eines Ablaufs.
 * Welche Ergebnisse in welchem Ablauftyp erlaubt sind, regelt
 * `ERLAUBTE_ERGEBNISSE` in src/engine/validate.ts.
 */
export const ErgebnisTypSchema = z.enum([
  // Funktionstest
  "bestanden",
  "nicht-bestanden",
  "teilweise",
  // Diagnose / Rückwärtsverfahren
  "reparatur",
  "behoben",
  "kein-befund",
  /** Kein Fehler feststellbar bzw. Verhalten ist so vorgesehen – keine Reparatur nötig. */
  "in-ordnung",
  // Reparatur
  "abgeschlossen",
  // überall
  "eskalation",
]);
export type ErgebnisTyp = z.infer<typeof ErgebnisTypSchema>;

/** Art der Antwort – steuert Farbe/Icon des Buttons. */
export const AntwortTypSchema = z.enum(["ja", "nein", "nicht-moeglich", "sonstige"]);

const AntwortRohSchema = z.strictObject({
  /** Stabile ID der Antwort. Standard: Antworttyp (ja/nein/…) bzw. aus dem Label abgeleitet. */
  id: IdSchema.optional(),
  label: z.string().min(1),
  typ: AntwortTypSchema.default("sonstige"),
  /** ID des nächsten Knotens im selben Ablauf. */
  weiter: IdSchema,
});

export const AntwortSchema = AntwortRohSchema.transform((a) => ({
  ...a,
  id: a.id ?? (a.typ !== "sonstige" ? a.typ : slugify(a.label)),
}));
export type Antwort = z.infer<typeof AntwortSchema>;

export const PflichtSchema = z.strictObject({
  /** Was bestätigt werden muss, z. B. „Anlage spannungsfrei geschaltet und gesichert“. */
  text: z.string().min(1),
  /** Optional mehrere Einzelpunkte, die alle abgehakt werden müssen. */
  punkte: z.array(z.string().min(1)).default([]),
});
export type Pflicht = z.infer<typeof PflichtSchema>;

export const KnotenSchema = z.strictObject({
  id: IdSchema,
  /**
   * frage      – Prüfung mit mehreren Antworten (Ja/Nein/…)
   * anweisung  – Arbeitsschritt, meist mit einer Antwort „Erledigt“
   * ergebnis   – Ende des Ablaufs
   */
  art: z.enum(["frage", "anweisung", "ergebnis"]),
  titel: z.string().min(1),
  inhalt: z.array(BlockSchema).default([]),
  /** Verweise auf IDs aus der Vorbereitung (Werkzeug/Material/Ersatzteile/Messgeräte). */
  benoetigt: z.array(IdSchema).default([]),
  /** Pflichtbestätigung – ohne sie sind die Antworten gesperrt. */
  pflicht: PflichtSchema.optional(),
  antworten: z.array(AntwortSchema).default([]),

  /** Nur bei art = ergebnis. */
  ergebnis: ErgebnisTypSchema.optional(),
  /** Bei ergebnis = reparatur: ID des Reparaturleitfadens. */
  reparatur: IdSchema.optional(),

  /** Rückwärtsverfahren: geprüfte Komponente und erwarteter Zustand. */
  komponente: z.string().optional(),
  erwarteterZustand: z.string().optional(),
});
export type Knoten = z.infer<typeof KnotenSchema>;

export const FlowDateiSchema = z.strictObject({
  typ: FlowTypSchema,
  titel: z.string().min(1),
  beschreibung: z.string().optional(),
  status: StatusSchema,
  version: z.number().int().positive(),
  freigabe: FreigabeSchema.optional(),
  /** ID des ersten Knotens. */
  start: IdSchema,
  /** Ablauf-weite Hinweise (z. B. Sicherheitsvorgaben vor Beginn einer Reparatur). */
  hinweise: z.array(BlockSchema).default([]),
  benoetigt: z.array(IdSchema).default([]),
  knoten: z.array(KnotenSchema).min(1),
});

/** Ein Ablauf; die ID entspricht dem Dateinamen ohne .yaml. */
export type Flow = z.infer<typeof FlowDateiSchema> & {
  id: string;
  /** Pfad der Quelldatei relativ zu content/ (für Fehlermeldungen). */
  quelle?: string;
};

/* ------------------------------------------------------------------ */
/* Hierarchie: Auftraggeber → Kunde → System → Variante              */
/* ------------------------------------------------------------------ */

export const HerstellerDateiSchema = z.strictObject({
  hersteller: z.array(z.strictObject({ id: IdSchema, name: z.string().min(1) })),
});
export type Hersteller = z.infer<typeof HerstellerDateiSchema>["hersteller"][number];

export const AnkunftSchema = z.strictObject({
  hinweise: z.array(BlockSchema).default([]),
  checkliste: z.array(ListenEintragSchema).default([]),
});
export type Ankunft = z.infer<typeof AnkunftSchema>;

export const AuftraggeberDateiSchema = z.strictObject({
  name: z.string().min(1),
  aktiv: z.boolean().default(true),
  links: z.strictObject({
    abmeldung: z.url(),
    dokumentation: z.url(),
  }),
  /** Step 2 – gilt für alle Kunden des Auftraggeber, sofern ein Kunde keine eigene Ankunft festlegt. */
  ankunft: AnkunftSchema.default({ hinweise: [], checkliste: [] }),
});

/**
 * Kunde unterhalb eines Auftraggeber – z. B. ein Kunde (Pan Oston → Lidl)
 * oder ein Kunde. Kann eigene Ankunftsvorgaben haben.
 */
export const KundeDateiSchema = z.strictObject({
  name: z.string().min(1),
  beschreibung: z.string().optional(),
  /** Ersetzt die Ankunftsvorgaben des Auftraggeber, z. B. Anmeldung im Lidl-Markt. */
  ankunft: AnkunftSchema.optional(),
});

export const SystemDateiSchema = z.strictObject({
  name: z.string().min(1),
  beschreibung: z.string().optional(),
  /** Feste Position in der Liste (1, 2, 3 …). Ohne Angabe: alphabetisch nach den sortierten. */
  reihenfolge: z.number().int().positive().optional(),
});

export const FehlerbildSchema = z.strictObject({
  id: IdSchema,
  titel: z.string().min(1),
  beschreibung: z.string().optional(),
  /** ID des Diagnoseablaufs. Fehlt er, zeigt die App „Kein Ablauf hinterlegt – Innendienst kontaktieren“. */
  diagnose: IdSchema.optional(),
  /** Optional: ID eines Rückwärtsverfahrens. */
  rueckwaerts: IdSchema.optional(),
});
export type Fehlerbild = z.infer<typeof FehlerbildSchema>;

export const VarianteDateiSchema = z.strictObject({
  /**
   * Verweis auf content/hersteller.yaml. Weglassen bei Systemen ohne Herstellerauswahl –
   * dann genau eine Variante (Ordner „standard“), die App öffnet sie direkt am System.
   */
  hersteller: IdSchema.optional(),
  /** Anzeigename, falls abweichend vom Hersteller – z. B. „Kesseböhmer Alt“ / „Kesseböhmer Neu“. */
  name: z.string().min(1).optional(),
  status: StatusSchema,
  beschreibung: z.string().optional(),
  /** Ablauf für Step 3. Fehlt er, ist für diese Variante noch kein Leitfaden hinterlegt. */
  funktionstest: IdSchema.optional(),
  /** Ablauf für Step 5. Standard: derselbe wie funktionstest. */
  nachtest: IdSchema.optional(),
  fehlerbilder: z.array(FehlerbildSchema).default([]),
});

export const VorbereitungDateiSchema = z.strictObject({
  werkzeug: z.array(ListenEintragSchema).default([]),
  messgeraete: z.array(ListenEintragSchema).default([]),
  material: z.array(ListenEintragSchema).default([]),
  ersatzteile: z.array(ListenEintragSchema).default([]),
  dokumente: z.array(ListenEintragSchema).default([]),
  hinweise: z.array(BlockSchema).default([]),
});
export type Vorbereitung = z.infer<typeof VorbereitungDateiSchema>;

/* ------------------------------------------------------------------ */
/* Zusammengesetzter Inhaltsbaum (Ergebnis des Ladens)                 */
/* ------------------------------------------------------------------ */

export type Variante = z.infer<typeof VarianteDateiSchema> & {
  /** Ordnername, z. B. "nera". */
  id: string;
  vorbereitung: Vorbereitung;
  flows: Record<string, Flow>;
};

export type System = z.infer<typeof SystemDateiSchema> & { id: string; varianten: Variante[] };
export type Kunde = z.infer<typeof KundeDateiSchema> & { id: string; systeme: System[] };
export type Auftraggeber = z.infer<typeof AuftraggeberDateiSchema> & { id: string; kunden: Kunde[] };

/** Ist für die Variante ein durchführbarer Leitfaden hinterlegt? Mindestens ein Fehlerbild genügt –
 * ohne eigenen Funktionstest wird der allgemeine verwendet (src/einsatz/standard.ts). */
export function leitfadenVorhanden(v: Pick<Variante, "fehlerbilder">): boolean {
  return v.fehlerbilder.length > 0;
}

export type ContentTree = {
  hersteller: Hersteller[];
  auftraggeber: Auftraggeber[];
};

/* ------------------------------------------------------------------ */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
