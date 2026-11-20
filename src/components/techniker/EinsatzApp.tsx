"use client";
/**
 * Geführter Leitfaden (Step 1–7) für eine Variante, z. B. Lidl → Zigarettenträger → NERA.
 * Die gesamte Ablauflogik liegt in src/einsatz/einsatz.ts – hier wird nur angezeigt und gespeichert.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { CircleCheck, ExternalLink, OctagonAlert, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import type { Block, ListenEintrag, Variante } from "@/src/content/schema";
import { stand } from "@/src/engine/run";
import * as E from "@/src/einsatz/einsatz";
import { useEinsatz } from "@/src/einsatz/speicher";
import { Button, ButtonExtern, ButtonLink } from "../ui/Button";
import { Karte } from "../ui/Karte";
import { Aktionsleiste } from "../ui/Rahmen";
import { EinsatzKopf } from "./EinsatzKopf";
import { FlowAnsicht } from "./FlowAnsicht";
import { AnkunftSchritt, AufnahmeSchritt, VorbereitungSchritt } from "./schritte/ListenSchritte";
import { Zusammenfassung } from "./Zusammenfassung";

export type EinsatzAppProps = {
  pfad: E.Einsatz["pfad"];
  bezeichnung: { auftraggeber: string; system: string; hersteller: string };
  variante: Variante;
  auftraggeber: {
    links: { abmeldung: string; dokumentation: string };
    ankunft: { hinweise: Block[]; checkliste: ListenEintrag[] };
  };
  /** Startseite des Auftraggebers (nach Abschluss/Abbruch). */
  startUrl: string;
  /** System-/Herstellerauswahl (Zurück aus Schritt 1). */
  auswahlUrl: string;
};

/** Der Leitfaden startet sofort – kein eigener Startknopf. */
export function EinsatzApp(props: EinsatzAppProps) {
  const [einsatz, setzen] = useEinsatz();
  const { pfad } = props;

  // Kein Leitfaden auf dem Gerät → beim Öffnen der Seite direkt mit Schritt 1 beginnen.
  // Nur einmal: Nach „Schließen“/„Abbrechen“ darf nicht sofort ein neuer entstehen.
  const automatischGestartet = useRef(false);
  useEffect(() => {
    if (einsatz) automatischGestartet.current = true; // es gab schon einen Leitfaden (z. B. nach Neuladen)
    else if (einsatz === null && !automatischGestartet.current) {
      automatischGestartet.current = true;
      setzen(E.neuerEinsatz(pfad));
    }
  }, [einsatz, pfad, setzen]);

  if (!einsatz) {
    return <div className="flex-1 animate-pulse p-4 text-text-leise">Lade Leitfaden …</div>;
  }

  const gehoertHierher =
    einsatz.pfad.auftraggeber === pfad.auftraggeber &&
    einsatz.pfad.kunde === pfad.kunde &&
    einsatz.pfad.system === pfad.system &&
    einsatz.pfad.variante === pfad.variante;

  if (!gehoertHierher) {
    return <AndererLeitfaden laufender={einsatz} onNeu={() => setzen(E.neuerEinsatz(pfad))} />;
  }

  return <EinsatzLauf {...props} einsatz={einsatz} setzen={setzen} />;
}

/** Auf dem Gerät ist noch ein anderer Leitfaden offen. */
function AndererLeitfaden({ laufender, onNeu }: { laufender: E.Einsatz; onNeu: () => void }) {
  const p = laufender.pfad;
  const info = E.schrittInfo(laufender.schritt);
  return (
    <>
      <main className="flex-1 space-y-5 px-4 py-5">
        <div role="alert" className="flex gap-3 rounded-xl border-2 border-orange-300 bg-warnung-hell p-4 text-orange-950">
          <TriangleAlert className="mt-0.5 size-6 shrink-0 text-warnung" aria-hidden />
          <div className="space-y-1">
            <p className="text-lg font-semibold">Es ist noch ein anderer Leitfaden offen</p>
            <p>
              {p.kunde} · {p.system} · {p.variante} – Schritt {info.nummer} {info.titel}
            </p>
            <p>Wird hier neu begonnen, gehen dessen Eingaben verloren.</p>
          </div>
        </div>
      </main>
      <Aktionsleiste>
        <ButtonLink href={`/${p.auftraggeber}/${p.kunde}/${p.system}/${p.variante}`} variante="primaer" breit>
          Offenen Leitfaden fortsetzen
        </ButtonLink>
        <Button variante="gefahr" gross={false} breit onClick={onNeu}>
          Verwerfen und hier neu beginnen
        </Button>
      </Aktionsleiste>
    </>
  );
}

function EinsatzLauf({ einsatz: e, setzen, variante: v, auftraggeber, bezeichnung, startUrl, auswahlUrl }: EinsatzAppProps & {
  einsatz: E.Einsatz;
  setzen: (e: E.Einsatz | null) => void;
}) {
  const router = useRouter();
  const kontext: E.Kontext = {
    variante: v,
    ankunftPflicht: auftraggeber.ankunft.checkliste.filter((c) => c.pflicht).map((c) => c.id),
  };
  const s = e.schritt;
  const info = E.schrittInfo(s);
  const lauf = E.aktiverLauf(e, v);
  const ergebnis = E.laufErgebnis(e, v);
  const pruefung = E.kannWeiter(e, kontext);
  const titelFehlerbild = (id: string) => v.fehlerbilder.find((f) => f.id === id)?.titel ?? id;
  const zusammenfassung = E.einsatzZusammenfassung(e, v);

  const aendern = (fn: (alt: E.Einsatz) => E.Einsatz) => {
    try {
      setzen(fn(e));
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } catch (fehler) {
      window.alert((fehler as Error).message);
    }
  };
  const weiter = () => aendern((x) => E.weiter(x, kontext));

  const zurueck = () => {
    if (lauf && (e.laeufe[lauf.slot]?.length ?? 0) > 0) aendern((x) => E.laufZurueck(x, v));
    else if (e.historie.length > 0) aendern(E.schrittZurueck);
    else router.push(auswahlUrl); // Schritt 1: zurück zur Auswahl, Fortschritt bleibt gespeichert
  };

  const namen = Object.fromEntries(
    [...v.vorbereitung.werkzeug, ...v.vorbereitung.messgeraete, ...v.vorbereitung.material, ...v.vorbereitung.ersatzteile, ...v.vorbereitung.dokumente].map((x) => [x.id, x.name]),
  );

  const unterzeile =
    s.typ === "diagnose" || s.typ === "reparatur"
      ? `${[bezeichnung.system, bezeichnung.hersteller].filter(Boolean).join(" ")} · ${titelFehlerbild(s.fehlerbild)}`
      : [bezeichnung.system, bezeichnung.hersteller].filter(Boolean).join(" · ");

  const kopf = (
    <EinsatzKopf
      nummer={info.nummer}
      titel={info.titel}
      unterzeile={unterzeile}
      position={info.position}
      onZurueck={zurueck}
      zurueckMoeglich
      menue={(schliessen) => (
        <>
          <Zusammenfassung text={zusammenfassung} />
          <Button
            variante="gefahr"
            gross={false}
            breit
            icon={<Trash2 className="size-4" />}
            onClick={() => {
              if (window.confirm("Leitfaden wirklich abbrechen? Alle Eingaben auf diesem Gerät werden gelöscht.")) {
                schliessen();
                setzen(null);
                router.push(startUrl);
              }
            }}
          >
            Leitfaden abbrechen und löschen
          </Button>
        </>
      )}
    />
  );

  /* ---------------- Ablauf-Schritte (Funktionstest, Diagnose, Reparatur, Nachtest) ---------------- */
  if (lauf) {
    const verlauf = e.laeufe[lauf.slot] ?? [];
    const knotenId = stand(lauf.flow, verlauf).knoten.id;
    return (
      <>
        {kopf}
        {s.typ === "diagnose" && e.fehlerbilder.length > 1 && <FehlerbildHinweis e={e} titel={titelFehlerbild} aktuell={s.fehlerbild} />}
        <FlowAnsicht
          key={lauf.slot}
          flow={lauf.flow}
          verlauf={verlauf}
          namen={namen}
          bestaetigt={E.bestaetigtePunkte(e, lauf.slot, knotenId)}
          onBestaetigung={(punkt) => aendern((x) => E.bestaetigungUmschalten(x, lauf.slot, knotenId, punkt))}
          onAntwort={(id) => aendern((x) => E.antworten(x, v, id))}
          onZurueck={() => aendern((x) => E.laufZurueck(x, v))}
          onKorrigieren={(i) => aendern((x) => E.laufKorrigieren(x, v, i))}
          ergebnisAktionen={
            ergebnis && (
              <ErgebnisAktionen
                e={e}
                v={v}
                ergebnis={ergebnis}
                zusammenfassung={zusammenfassung}
                weiter={weiter}
                aendern={aendern}
              />
            )
          }
        />
      </>
    );
  }

  /* ---------------- Übrige Schritte ---------------- */
  let inhalt: React.ReactNode;
  let leiste: React.ReactNode = (
    <>
      {!pruefung.ok && <p className="text-center text-sm font-medium text-text-leise">{pruefung.grund}</p>}
      <Button variante="primaer" breit disabled={!pruefung.ok} onClick={weiter}>
        Weiter
      </Button>
    </>
  );

  switch (s.typ) {
    case "vorbereitung":
      inhalt = (
        <VorbereitungSchritt
          vorbereitung={v.vorbereitung}
          an={e.vorbereitung}
          fehlerbilder={v.fehlerbilder}
          onUmschalten={(id) => aendern((x) => E.checkUmschalten(x, "vorbereitung", id))}
        />
      );
      break;
    case "ankunft":
      inhalt = (
        <AnkunftSchritt
          hinweise={auftraggeber.ankunft.hinweise}
          checkliste={auftraggeber.ankunft.checkliste}
          an={e.ankunft}
          onUmschalten={(id) => aendern((x) => E.checkUmschalten(x, "ankunft", id))}
        />
      );
      break;
    case "aufnahme":
      inhalt = (
        <AufnahmeSchritt
          fehlerbilder={v.fehlerbilder}
          gewaehlt={e.fehlerbilder}
          onUmschalten={(id) => aendern((x) => E.fehlerbildUmschalten(x, id))}
          notiz={e.notiz}
          onNotiz={(text) => setzen(E.notizSetzen(e, text))}
        />
      );
      leiste = (
        <>
          {!pruefung.ok && <p className="text-center text-sm font-medium text-text-leise">{pruefung.grund}</p>}
          <Button variante="primaer" breit disabled={!pruefung.ok} onClick={weiter}>
            Weiter zum Funktionstest
          </Button>
        </>
      );
      break;
    case "diagnose":
      // Fehlerbild ohne hinterlegten Ablauf
      inhalt = (
        <>
          {e.fehlerbilder.length > 1 && <FehlerbildHinweis e={e} titel={titelFehlerbild} aktuell={s.fehlerbild} eingebettet />}
          <div role="alert" className="flex gap-3 rounded-xl border-2 border-orange-300 bg-warnung-hell p-4 text-orange-950">
            <TriangleAlert className="mt-0.5 size-6 shrink-0 text-warnung" aria-hidden />
            <div>
              <p className="text-lg font-semibold">Kein Diagnoseablauf hinterlegt</p>
              <p>Für „{titelFehlerbild(s.fehlerbild)}“ gibt es noch keinen Ablauf. Bitte den Innendienst kontaktieren.</p>
            </div>
          </div>
          <Zusammenfassung text={zusammenfassung} />
        </>
      );
      leiste = (
        <>
          <Button variante="primaer" breit onClick={weiter}>
            {E.offeneFehlerbilder(e).length > 1 ? "Weiter zum nächsten Fehlerbild" : "Weiter zum Funktionstest"}
          </Button>
          <Button variante="gefahr" gross={false} breit onClick={() => aendern(E.nichtErfolgreichBeenden)}>
            Als nicht erfolgreich abschließen
          </Button>
        </>
      );
      break;
    case "restfehler":
      inhalt = (
        <>
          <Karte className="flex gap-3 border-ok bg-ok-hell">
            <CircleCheck className="size-6 shrink-0 text-ok" aria-hidden />
            <p>Der Funktionstest ist bestanden. Bestehen die folgenden Fehler noch?</p>
          </Karte>
          {e.fehlerbilder
            .filter((id) => ["offen", "nicht-mehr-vorhanden"].includes(e.fehlerbildStatus[id] ?? "offen"))
            .map((id) => {
              const status = e.fehlerbildStatus[id] ?? "offen";
              return (
                <Karte key={id} className="space-y-3">
                  <p className="text-lg font-semibold">{titelFehlerbild(id)}</p>
                  {status === "nicht-mehr-vorhanden" ? (
                    <p className="flex items-center gap-2 text-ok">
                      <CircleCheck className="size-5" aria-hidden /> Nicht mehr vorhanden
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variante="nein" onClick={() => aendern((x) => E.fehlerbildDiagnostizieren(x, v, id))}>
                        Besteht noch
                      </Button>
                      <Button variante="ja" onClick={() => aendern((x) => E.fehlerbildNichtMehrVorhanden(x, id))}>
                        Behoben
                      </Button>
                    </div>
                  )}
                </Karte>
              );
            })}
        </>
      );
      break;
    case "abmeldung":
    case "dokumentation": {
      const istAbmeldung = s.typ === "abmeldung";
      inhalt = (
        <>
          <ErgebnisBanner ergebnis={e.ergebnis} />
          <Karte className="space-y-3">
            <p className="text-lg">
              {istAbmeldung
                ? "Die Abmeldung erfolgt über die Exakt-Service-Anwendung."
                : "Den Auftrag jetzt in der Exakt-Service-Anwendung dokumentieren und abschließen."}
            </p>
            <ButtonExtern
              href={istAbmeldung ? auftraggeber.links.abmeldung : auftraggeber.links.dokumentation}
              variante="sekundaer"
              breit
              icon={<ExternalLink className="size-5" />}
            >
              {istAbmeldung ? "Abmeldung öffnen" : "Bericht öffnen"}
            </ButtonExtern>
          </Karte>
          {!istAbmeldung && <Zusammenfassung titel="Zusammenfassung für den Bericht" text={zusammenfassung} />}
        </>
      );
      leiste = (
        <Button variante="primaer" breit onClick={weiter}>
          {istAbmeldung ? "Abmeldung erledigt" : "Dokumentation erledigt"}
        </Button>
      );
      break;
    }
    case "abgeschlossen":
      inhalt = (
        <>
          <Karte className="space-y-2 border-ok bg-ok-hell text-center">
            <CircleCheck className="mx-auto size-12 text-ok" aria-hidden />
            <p className="text-2xl font-bold">Serviceablauf abgeschlossen</p>
            <p className="text-text-leise">Vielen Dank. Der Leitfaden kann jetzt geschlossen werden.</p>
          </Karte>
          <ErgebnisBanner ergebnis={e.ergebnis} />
        </>
      );
      leiste = (
        <Button
          variante="primaer"
          breit
          onClick={() => {
            setzen(null);
            router.push(startUrl);
          }}
        >
          Leitfaden schließen
        </Button>
      );
      break;
  }

  return (
    <>
      {kopf}
      <main className="flex-1 space-y-5 px-4 py-5">{inhalt}</main>
      <Aktionsleiste>{leiste}</Aktionsleiste>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ErgebnisAktionen({ e, v, ergebnis, zusammenfassung, weiter, aendern }: {
  e: E.Einsatz;
  v: Variante;
  ergebnis: NonNullable<ReturnType<typeof E.laufErgebnis>>;
  zusammenfassung: string;
  weiter: () => void;
  aendern: (fn: (x: E.Einsatz) => E.Einsatz) => void;
}) {
  const s = e.schritt;
  const nichtErfolgreich = (
    <Button variante="gefahr" gross={false} breit onClick={() => aendern(E.nichtErfolgreichBeenden)}>
      Als nicht erfolgreich abschließen
    </Button>
  );
  const weiterLabel = () => {
    if (s.typ === "diagnose" && ["eskalation", "kein-befund", "in-ordnung"].includes(ergebnis.ergebnis))
      return E.offeneFehlerbilder(e).length > 1 ? "Weiter zum nächsten Fehlerbild" : "Weiter zum Funktionstest";
    return undefined;
  };

  switch (s.typ) {
    case "funktionstest":
      return (
        <>
          <Button variante="primaer" breit onClick={weiter}>
            Weiter zur Fehleranalyse
          </Button>
          {ergebnis.ergebnis === "bestanden" && (
            <Button breit gross={false} onClick={() => aendern((x) => E.keinFehlerFeststellbar(x, v))}>
              Kein Fehler feststellbar – zur Abmeldung
            </Button>
          )}
        </>
      );

    case "nachtest":
      return ergebnis.ergebnis === "bestanden" ? (
        <Button variante="primaer" breit onClick={weiter}>
          Weiter
        </Button>
      ) : (
        <>
          <Button variante="primaer" breit icon={<RotateCcw className="size-5" />} onClick={weiter}>
            Zurück zur Fehleranalyse
          </Button>
          {nichtErfolgreich}
        </>
      );

    case "reparatur":
      return ergebnis.ergebnis === "eskalation" ? (
        <>
          <Eskalation text={zusammenfassung} />
          <Button variante="primaer" breit onClick={weiter}>
            Weiter zum Funktionstest
          </Button>
          {nichtErfolgreich}
        </>
      ) : (
        <Button variante="primaer" breit onClick={weiter}>
          Weiter zum Funktionstest
        </Button>
      );

    case "diagnose": {
      const fb = v.fehlerbilder.find((f) => f.id === s.fehlerbild);
      if (ergebnis.ergebnis === "reparatur")
        return (
          <Button variante="primaer" breit onClick={weiter}>
            Reparaturleitfaden öffnen
          </Button>
        );
      if (ergebnis.ergebnis === "behoben")
        return (
          <Button variante="primaer" breit onClick={weiter}>
            Weiter zum Funktionstest
          </Button>
        );
      if (ergebnis.ergebnis === "in-ordnung")
        return (
          <Button variante="primaer" breit onClick={weiter}>
            {weiterLabel()}
          </Button>
        );
      return (
        <>
          {ergebnis.ergebnis === "eskalation" && <Eskalation text={zusammenfassung} />}
          {s.verfahren === "diagnose" && fb?.rueckwaerts && (
            <Button variante="primaer" breit onClick={() => aendern((x) => E.rueckwaertsStarten(x, v))}>
              Rückwärtsverfahren starten (3.2)
            </Button>
          )}
          <Button variante={s.verfahren === "diagnose" && fb?.rueckwaerts ? "sekundaer" : "primaer"} breit onClick={weiter}>
            {weiterLabel()}
          </Button>
          {nichtErfolgreich}
        </>
      );
    }
    default:
      return null;
  }
}

function Eskalation({ text }: { text: string }) {
  return (
    <details className="rounded-xl border border-blue-200 bg-info-hell">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold text-blue-950">
        Zusammenfassung für den Innendienst anzeigen
      </summary>
      <div className="p-2 pt-0">
        <Zusammenfassung text={text} />
      </div>
    </details>
  );
}

function ErgebnisBanner({ ergebnis }: { ergebnis: E.Einsatz["ergebnis"] }) {
  if (ergebnis === "nicht-erfolgreich")
    return (
      <div role="alert" className="flex gap-3 rounded-xl border-2 border-red-300 bg-sicherheit-hell p-4 text-red-950">
        <OctagonAlert className="mt-0.5 size-6 shrink-0 text-sicherheit" aria-hidden />
        <p>
          <strong>Nicht erfolgreich abgeschlossen.</strong> Bitte im Bericht dokumentieren, was durchgeführt wurde und was offen ist.
        </p>
      </div>
    );
  if (ergebnis === "kein-fehler")
    return <Karte>Funktionstest bestanden – kein Fehler feststellbar.</Karte>;
  if (ergebnis === "erfolgreich")
    return (
      <Karte className="flex items-center gap-3 border-ok bg-ok-hell">
        <CircleCheck className="size-6 shrink-0 text-ok" aria-hidden /> Funktionstest nach Reparatur bestanden.
      </Karte>
    );
  return null;
}

function FehlerbildHinweis({ e, titel, aktuell, eingebettet = false }: {
  e: E.Einsatz;
  titel: (id: string) => string;
  aktuell: string;
  eingebettet?: boolean;
}) {
  return (
    <div className={`flex gap-2 overflow-x-auto ${eingebettet ? "" : "border-b border-rand bg-karte px-4 py-2"}`}>
      {e.fehlerbilder.map((id, i) => {
        const status = e.fehlerbildStatus[id] ?? "offen";
        const aktiv = id === aktuell;
        return (
          <span
            key={id}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
              aktiv ? "border-tinte bg-akzent font-semibold text-tinte" : status === "offen" ? "border-rand" : "border-rand text-text-leise line-through"
            }`}
          >
            {i + 1}. {titel(id)}
          </span>
        );
      })}
    </div>
  );
}
