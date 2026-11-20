# Exakt-Service Navigator

Interaktiver Service- und Diagnoseleitfaden für Techniker von Exakt-Service –
mit vollständiger Handbuchansicht für den Innendienst.

- **Konzept & Entscheidungen:** [docs/KONZEPT.md](docs/KONZEPT.md)
- **Inhalte schreiben (Prüfungen, Abläufe):** [docs/INHALTE.md](docs/INHALTE.md)

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Konzept | ✅ |
| 2 | Datenschema, Diagnose-Engine, Inhaltsprüfung, Demo-Inhalt NERA | ✅ |
| 3 | Technikerablauf (Oberfläche) | offen |
| 4 | Innendienst | offen |

## Installation

Voraussetzung: [Node.js](https://nodejs.org) 22 oder neuer, Git.

```bash
git clone https://github.com/Kevin-Exakt/Exakt-Leitfaden.git
cd Exakt-Leitfaden
npm install
npm run dev          # http://localhost:3000
```

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm test` | Tests (Engine, Validierung, Inhalte) |
| `npm run validate` | Prüft alle Inhalte unter `content/` – zeigt Datei und Stelle jedes Fehlers |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run lint` | Code-Stil |
| `npm run build` | Produktions-Build (prüft vorher automatisch die Inhalte) |

## Aufbau

```
app/                 Seiten und Layouts (Next.js App Router)
src/engine/          Diagnose-Engine – reines TypeScript, unabhängig von der Oberfläche
src/content/         Datenschema, Laden und Prüfen der Inhalte, Repository
content/             Fachinhalte als YAML (Kunde → Bereich → System → Hersteller → Abläufe)
public/medien/       Bilder, PDFs
scripts/             Hilfsskripte (Inhaltsprüfung)
docs/                Konzept, Inhaltsanleitung
```

## Zusammenarbeit

- `main` ist immer lauffähig. Änderungen nur per Pull Request.
- Branches: `feature/<thema>` für Code, `content/<system>` für Inhalte.
- Jeder Pull Request wird automatisch geprüft (Tests, Typen, Lint, Inhalte) und auf Vercel als Vorschau gebaut.
- Fachliche Inhalte werden von der jeweils anderen Person im Pull Request geprüft und freigegeben.
- Projektkontext für Claude Code steht in [CLAUDE.md](CLAUDE.md).
