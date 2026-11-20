import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "./load";
import { createRepository } from "./repository";
import { validateContent } from "./validate-content";

const root = process.cwd();

describe("Inhalte unter content/", () => {
  const { tree, probleme } = loadContent(path.join(root, "content"));
  const alle = [
    ...probleme,
    ...validateContent(tree, { medienExistiert: (src) => fs.existsSync(path.join(root, "public", src)) }),
  ];

  it("enthalten keine Fehler", () => {
    expect(alle.filter((p) => p.schwere === "fehler")).toEqual([]);
  });

  it("enthalten alle Kunden und den Piloten Pan Oston → Lidl → Zigarettenträger → NERA", () => {
    const repo = createRepository(tree);
    expect(repo.getKunden().map((k) => k.name)).toEqual(["InstaServe", "Iris", "Pan Oston", "Retec", "Rowius"]);
    expect(repo.getKunde("lidl")).toBeUndefined();
    expect(repo.getKunde("pan-oston")?.bereiche.find((b) => b.id === "lidl")?.ankunft?.checkliste).toHaveLength(3);
    const pfad = { kunde: "pan-oston", bereich: "lidl", system: "zigarettentraeger", variante: "nera" };
    const nera = repo.getVariante(pfad);
    expect(nera?.hersteller).toBe("nera");
    expect(repo.getFlow(pfad, "faehrt-nicht-auf")?.typ).toBe("diagnose");
    expect(repo.getKunde("pan-oston")?.links.dokumentation).toBe("https://bericht.service-exakt.de/");
  });
});

describe("Laden & Querverweise", () => {
  function tempContent(dateien: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "exakt-content-"));
    for (const [datei, inhalt] of Object.entries(dateien)) {
      fs.mkdirSync(path.dirname(path.join(dir, datei)), { recursive: true });
      fs.writeFileSync(path.join(dir, datei), inhalt);
    }
    return dir;
  }

  const minimal = {
    "hersteller.yaml": "hersteller:\n  - { id: nera, name: NERA }\n",
    "k/kunde.yaml":
      "name: K\nlinks: { abmeldung: 'https://a.de', dokumentation: 'https://a.de' }\nankunft: {}\n",
    "k/b/bereich.yaml": "name: B\n",
    "k/b/s/system.yaml": "name: S\n",
    "k/b/s/v/vorbereitung.yaml": "werkzeug: []\n",
    "k/b/s/v/abl/test.yaml":
      "typ: funktionstest\ntitel: T\nstatus: entwurf\nversion: 1\nstart: ende\n" +
      "knoten:\n  - { id: ende, art: ergebnis, ergebnis: bestanden, titel: OK }\n",
  };

  it("meldet Schemafehler mit Datei und Feld", () => {
    const dir = tempContent({
      ...minimal,
      "k/b/s/v/variante.yaml": "hersteller: nera\nstatus: fertig\nfunktionstest: test\nfehlerbilder: []\n",
    });
    const { probleme } = loadContent(dir);
    expect(probleme.map((p) => p.ort)).toEqual(
      expect.arrayContaining(["k/b/s/v/variante.yaml › status", "k/b/s/v/variante.yaml › fehlerbilder"]),
    );
  });

  it("meldet Verweise auf fehlende oder falsche Abläufe", () => {
    const dir = tempContent({
      ...minimal,
      "k/b/s/v/variante.yaml":
        "hersteller: unbekannt\nstatus: entwurf\nfunktionstest: test\n" +
        "fehlerbilder:\n  - { id: f, titel: F, diagnose: fehlt }\n  - { id: g, titel: G, diagnose: test }\n",
    });
    const { tree, probleme } = loadContent(dir);
    expect(probleme).toEqual([]);
    const meldungen = validateContent(tree).map((p) => p.meldung);
    expect(meldungen).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Hersteller "unbekannt"'),
        expect.stringContaining('Ablauf "fehlt" existiert nicht'),
        expect.stringContaining('erwartet "diagnose"'),
      ]),
    );
  });
});
