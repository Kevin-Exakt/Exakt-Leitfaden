"use client";
import { CircleAlert } from "lucide-react";
import type { Block, Fehlerbild, ListenEintrag, Vorbereitung } from "@/src/content/schema";
import { Bloecke } from "../../blocks/Bloecke";
import { CheckItem } from "../../ui/CheckItem";
import { Abschnitt } from "../../ui/Karte";

function Liste({ titel, eintraege, an, onUmschalten }: {
  titel: string;
  eintraege: ListenEintrag[];
  an: string[];
  onUmschalten: (id: string) => void;
}) {
  if (!eintraege.length) return null;
  const erledigt = eintraege.filter((e) => an.includes(e.id)).length;
  return (
    <Abschnitt titel={titel} aktion={<span className="text-sm text-text-leise">{erledigt}/{eintraege.length}</span>}>
      <div className="space-y-2">
        {eintraege.map((e) => (
          <CheckItem
            key={e.id}
            an={an.includes(e.id)}
            onUmschalten={() => onUmschalten(e.id)}
            pflicht={e.pflicht}
            zusatz={[e.menge, e.hinweis].filter(Boolean).join(" · ") || undefined}
          >
            {e.name}
          </CheckItem>
        ))}
      </div>
    </Abschnitt>
  );
}

export function VorbereitungSchritt({ vorbereitung: vb, an, onUmschalten, fehlerbilder }: {
  vorbereitung: Vorbereitung;
  an: string[];
  onUmschalten: (id: string) => void;
  fehlerbilder: Fehlerbild[];
}) {
  return (
    <>
      <p className="text-text-leise">Vor der Abfahrt prüfen, ob alles dabei ist.</p>
      {[vb.werkzeug, vb.messgeraete, vb.material, vb.ersatzteile, vb.dokumente].every((l) => l.length === 0) && (
        <Bloecke bloecke={[{ typ: "hinweis", titel: "Noch keine Vorbereitungsliste", text: "Für dieses System sind Werkzeug, Material und Ersatzteile noch nicht hinterlegt." }]} />
      )}
      <Bloecke bloecke={vb.hinweise} />
      <Liste titel="Werkzeug" eintraege={vb.werkzeug} an={an} onUmschalten={onUmschalten} />
      <Liste titel="Messgeräte" eintraege={vb.messgeraete} an={an} onUmschalten={onUmschalten} />
      <Liste titel="Material" eintraege={vb.material} an={an} onUmschalten={onUmschalten} />
      <Liste titel="Ersatzteile" eintraege={vb.ersatzteile} an={an} onUmschalten={onUmschalten} />
      <Liste titel="Dokumente" eintraege={vb.dokumente} an={an} onUmschalten={onUmschalten} />
      <Abschnitt titel="Mögliche Fehlerbilder">
        <ul className="list-inside list-disc text-text-leise">
          {fehlerbilder.map((f) => (
            <li key={f.id}>{f.titel}</li>
          ))}
        </ul>
      </Abschnitt>
    </>
  );
}

export function AnkunftSchritt({ hinweise, checkliste, an, onUmschalten }: {
  hinweise: Block[];
  checkliste: ListenEintrag[];
  an: string[];
  onUmschalten: (id: string) => void;
}) {
  return (
    <>
      <Bloecke bloecke={hinweise} />
      <Liste titel="Bei Ankunft" eintraege={checkliste} an={an} onUmschalten={onUmschalten} />
    </>
  );
}

export function AufnahmeSchritt({ fehlerbilder, gewaehlt, onUmschalten, notiz, onNotiz }: {
  fehlerbilder: Fehlerbild[];
  gewaehlt: string[];
  onUmschalten: (id: string) => void;
  notiz: string;
  onNotiz: (text: string) => void;
}) {
  return (
    <>
      <Abschnitt titel="Was ist der Fehler?">
        <p className="text-sm text-text-leise">Mehrfachauswahl möglich. Die Reihenfolge der Auswahl ist die Reihenfolge der Diagnose.</p>
        <div className="space-y-2">
          {fehlerbilder.map((f) => {
            const index = gewaehlt.indexOf(f.id);
            const ohneAblauf = !f.diagnose && !f.rueckwaerts;
            return (
              <CheckItem
                key={f.id}
                an={index >= 0}
                pflicht
                onUmschalten={() => onUmschalten(f.id)}
                zusatz={
                  ohneAblauf ? (
                    <span className="inline-flex items-center gap-1">
                      <CircleAlert className="size-4" aria-hidden /> Noch kein Diagnoseablauf hinterlegt
                    </span>
                  ) : (
                    f.beschreibung
                  )
                }
              >
                {index >= 0 && <span className="mr-2 text-text-leise">{index + 1}.</span>}
                {f.titel}
              </CheckItem>
            );
          })}
        </div>
      </Abschnitt>
      <Abschnitt titel="Ist-Zustand / Beschreibung (optional)">
        <textarea
          value={notiz}
          onChange={(ev) => onNotiz(ev.target.value)}
          rows={4}
          placeholder="Was ist vor Ort zu sehen? Sichtbare Beschädigungen, Vorgeschichte …"
          className="w-full rounded-xl border border-rand bg-karte p-3 text-base outline-none focus:border-tinte"
        />
      </Abschnitt>
    </>
  );
}
