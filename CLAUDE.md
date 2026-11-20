# Exakt-Service Navigator – Projektkontext

Interaktive Service-Webapp für Techniker von **Exakt-Service**. Führt Techniker Schritt für Schritt
durch einen Serviceeinsatz (Vorbereitung → Ankunft → Fehleraufnahme → Funktionstest → Diagnose →
Reparatur → Nachtest → Abmeldung/Doku) und bietet dem Innendienst eine vollständige Handbuchansicht.
Erster Kunde: **Lidl**, Pilot: **Zigarettenträger → NERA**.

Vollständiges Konzept: `docs/KONZEPT.md` (Abschnitt 0 = getroffene Entscheidungen).
Inhalte schreiben: `docs/INHALTE.md`.

## Feste Entscheidungen

- Kein Login, kein Offline-Modus, keine Fotoaufnahme. Frei zugänglich mit Link, aber `noindex`.
- Nur Deutsch. Code-Bezeichner fachlich auf Deutsch (Knoten, Antwort, Verlauf …), technische auf Englisch ok.
- Firmenfarbe Gelb `#FACC15` (Hover `#EAB308`), Text darauf `#111827`. Gelb nie als Schrift auf Weiß.
- Abmeldung und Dokumentation: Link aus `content/<kunde>/kunde.yaml` (`https://bericht.service-exakt.de/`).
- Keine Datenbank. Inhalte sind YAML-Dateien unter `content/`. Einsatz-Zustand nur im Browser.

## Architektur

- `src/content/schema.ts` – Zod-Schemas = verbindliche Datenstruktur. Änderungen im Team absprechen.
- `src/content/load.ts` – liest `content/` (nur serverseitig, nutzt `fs`).
- `src/content/repository.ts` – **einzige** Stelle, über die Seiten Inhalte lesen.
- `src/content/validate-content.ts` – Querverweise zwischen Dateien.
- `src/engine/` – Diagnose-Engine. **Reines TypeScript, keine Imports aus React/Next/fs.**
  Zustandslos: `stand(flow, verlauf)` berechnet den aktuellen Knoten aus dem Antwortverlauf.
- `src/einsatz/einsatz.ts` – Ablaufsteuerung Step 1–7 (rein, getestet). Regeln: jedes Fehlerbild
  nacheinander, nach Reparatur/Behebung/Eskalation immer Nachtest, Abmeldung erst nach bestandenem
  Nachtest oder bewusstem „nicht erfolgreich“. `speicher.ts` = localStorage-Hook.
- `src/components/` – `ui/` Bausteine, `blocks/` Inhaltsblöcke, `techniker/` Einsatz & Prüfungsansicht.
  Client-Komponenten dürfen aus `src/content` nur **Typen** importieren (kein `fs`, kein Zod im Browser).
- `app/` – nur Routen/Layouts, keine Fachlogik. Seiten lesen Inhalte über `src/content/navigation.ts`
  bzw. `getRepository()` und nutzen `generateStaticParams`.

Alle Abläufe (Funktionstest, Diagnose, Rückwärtsverfahren, Reparatur) nutzen dasselbe Knotenmodell.

## Regeln

- **Keine technischen Prüf- oder Reparaturanweisungen erfinden.** Beispielinhalte immer als
  „DEMO – nicht fachlich freigegeben“ kennzeichnen und `status: entwurf` setzen.
- Nach Änderungen: `npm test`, `npm run typecheck`, `npm run lint`, `npm run validate`.
- Arbeit auf Branches (`feature/…`, `content/…`), Merge in `main` nur per Pull Request.
- Keine Riesendateien: eine Datei = ein Ablauf / eine Komponente.

@AGENTS.md
