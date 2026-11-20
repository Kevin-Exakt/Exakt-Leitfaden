import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../content/load";
import { baueSuchindex } from "../content/suchindex";
import { normalisiere, suche } from "./suche";

const index = baueSuchindex(loadContent(path.join(process.cwd(), "content")).tree);

describe("Schnellsuche", () => {
  it("normalisiert Umlaute und ß", () => {
    expect(normalisiere("Schließt Öffnet Kesseböhmer")).toBe("schliesst offnet kessebohmer");
  });

  it("„ITAB ZT schließt nicht“ findet die ITAB-Fehlerbilder", () => {
    const t = suche(index, "ITAB ZT schließt nicht");
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((x) => x.art === "fehlerbild" && x.href.includes("/zigarettentraeger/itab"))).toBe(true);
    expect(t.map((x) => x.titel)).toContain("Zigarettenträger schließt nicht komplett");
    expect(t.find((x) => x.titel === "Zigarettenträger schließt nicht komplett")?.href).toBe(
      "/pan-oston/lidl/zigarettentraeger/itab?fehlerbild=schliesst-nicht-komplett",
    );
  });

  it("findet mit Wortanfängen, ohne Umlaute und klein geschrieben", () => {
    expect(suche(index, "itab zt schliesst komp")[0]?.titel).toBe("Zigarettenträger schließt nicht komplett");
    expect(suche(index, "15 sek")[0]?.titel).toBe("15-Sekunden-Modus nicht aktiv");
  });

  it("findet Systeme und Hersteller", () => {
    expect(suche(index, "kls wanzl")[0]).toMatchObject({ titel: "KLS · Wanzl", href: "/pan-oston/lidl/kls/wanzl" });
    expect(suche(index, "kesse alt")[0]?.titel).toBe("Zigarettenträger · Kesseböhmer Alt");
    expect(suche(index, "eas rf")[0]).toMatchObject({ titel: "EAS RF", href: "/retec/direkt/eas-rf" });
  });

  it("liefert nichts bei leerer Eingabe oder unbekannten Wörtern", () => {
    expect(suche(index, "  ")).toEqual([]);
    expect(suche(index, "itab gibtsnicht")).toEqual([]);
  });
});
