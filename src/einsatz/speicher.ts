"use client";
/**
 * Speichert den laufenden Einsatz im Browser (localStorage).
 * Ein Gerät = ein laufender Einsatz. Kein Server, keine Übertragung.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { Einsatz } from "./einsatz";

const SCHLUESSEL = "exakt.einsatz.v2";
const hoerer = new Set<() => void>();

let zwischenspeicher: { roh: string | null; wert: Einsatz | null } = { roh: null, wert: null };

function lesen(): Einsatz | null {
  let roh: string | null = null;
  try {
    roh = window.localStorage.getItem(SCHLUESSEL);
  } catch {
    return zwischenspeicher.wert;
  }
  if (roh === zwischenspeicher.roh) return zwischenspeicher.wert;
  let wert: Einsatz | null = null;
  try {
    const daten = roh ? JSON.parse(roh) : null;
    wert = daten?.version === 2 ? (daten as Einsatz) : null;
  } catch {
    wert = null;
  }
  zwischenspeicher = { roh, wert };
  return wert;
}

function schreiben(e: Einsatz | null) {
  const roh = e ? JSON.stringify(e) : null;
  zwischenspeicher = { roh, wert: e };
  try {
    if (roh) window.localStorage.setItem(SCHLUESSEL, roh);
    else window.localStorage.removeItem(SCHLUESSEL);
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus) – Einsatz läuft im Arbeitsspeicher weiter.
  }
  hoerer.forEach((h) => h());
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  const beiAenderung = (ev: StorageEvent) => ev.key === SCHLUESSEL && h();
  window.addEventListener("storage", beiAenderung);
  return () => {
    hoerer.delete(h);
    window.removeEventListener("storage", beiAenderung);
  };
}

/** undefined = noch nicht geladen (Server/erster Render), null = kein Einsatz. */
export function useEinsatz(): [Einsatz | null | undefined, (e: Einsatz | null) => void] {
  const einsatz = useSyncExternalStore(abonnieren, lesen, () => undefined);
  const setzen = useCallback((e: Einsatz | null) => schreiben(e), []);
  return [einsatz, setzen];
}
