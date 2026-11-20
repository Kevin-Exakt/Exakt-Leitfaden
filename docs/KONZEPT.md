# Service Navigator – Konzept & Architektur (Phase 1)

> Status: **Entwurf zur Abstimmung** – noch keine Umsetzung.
> Grundlage: Projektbriefing „Interaktiver Service Navigator für Techniker“.
> Pilot: **Lidl → Service → Zigarettenträger → NERA**

---

## 0. Kurzfassung

- **Technik:** Next.js (bereits im Repo angelegt, Version 16) + TypeScript + Tailwind. Keine Datenbank, kein Login, kein eigener Server. Supabase kommt nur dazu, falls später ein Admin-Editor gebaut wird.
- **Kernidee:** Alle Inhalte (Systeme, Prüfungen, Entscheidungsbäume, Reparaturleitfäden) sind **Daten**, keine Programmlogik. Die App ist nur der „Abspieler“. Technikeransicht und Innendienst-Handbuch lesen **dieselben** Daten – sie können nie auseinanderlaufen.
- **Inhalte zuerst als Dateien im Repo**, später in der Datenbank. Dazwischen liegt eine Schnittstelle, sodass der Wechsel die Oberfläche nicht berührt.
- **Diagnose-Engine** = kleiner, gut getesteter TypeScript-Baustein ohne UI. Ein Ablauf ist ein Graph aus Knoten (Prüfung, Anweisung, Ergebnis …) und Antworten, die auf den nächsten Knoten zeigen.
- **Mobile App:** zuerst als installierbare **PWA** (Homescreen-Icon, ohne Offline-Modus). Eine native App ist später möglich, aber vermutlich nicht nötig.

### Getroffene Entscheidungen (Rückmeldung 20.11.2026)

| Thema | Entscheidung | Folge für die Umsetzung |
|---|---|---|
| Offline | **nicht benötigt** | Kein Service Worker / Offline-Cache. App setzt Internetverbindung voraus. |
| Fotos | **keine Fotoaufnahme** durch Techniker | Keine Kamera, kein Upload, kein Speicher für Fotos. Fehleraufnahme = Auswahl + Freitext-Notiz. |
| Bilder | **Beispielbilder** in Anleitungen | Bilder liegen als statische Dateien im Repo (`public/medien/…`), klar als Beispiel gekennzeichnet. |
| Login | **kein Login**, frei verfügbar für alle mit Link | Keine Benutzerverwaltung für Techniker/Innendienst. Seiten werden für Suchmaschinen gesperrt (`noindex`). |
| Firma / Branding | **Exakt-Service**, Firmenfarbe **Gelb**, Logo folgt | Gelb als Akzentfarbe (siehe Abschnitt 8). Platzhalter für Logo bis zur Lieferung. |
| Abmeldung (Step 6) & Dokumentation (Step 7) | beides über **https://bericht.service-exakt.de/** | Schritt 6 und 7 zeigen jeweils einen großen Button, der die Seite in neuem Tab öffnet. Link zentral in `content/lidl/kunde.yaml` hinterlegt, damit er nur an einer Stelle gepflegt wird. |
| Akzentfarbe | **Exakt-Gelb `#FACC15`** (Hover/aktiv `#EAB308`), Schrift darauf `#111827` | Kontrast ca. 13:1 – auch in heller Umgebung und draußen gut erkennbar. Wird ggf. an das Logo angeglichen. |
| Fachliche Freigabe | **gemeinsam** durch beide Projektverantwortlichen | Inhalts-Pull-Requests werden von der jeweils anderen Person geprüft und freigegeben. |
| Sprache | **nur Deutsch** | Keine Mehrsprachigkeit; Texte direkt in Inhaltsdateien und Komponenten. |

Damit entfällt für Techniker- und Innendienstansicht der Bedarf an Supabase komplett. Eine Datenbank wird erst relevant, wenn ein Admin-Editor (Phase 6) gebaut wird – und **nur dieser** bräuchte dann einen geschützten Zugang.

---

## 1. Technische Empfehlung

| Baustein | Empfehlung | Begründung |
|---|---|---|
| Framework | **Next.js (App Router) + React + TypeScript** | Bereits angelegt, Vercel-nativ, eine Codebasis für Techniker- und Innendienstansicht. TypeScript fängt Fehler in der Datenstruktur früh ab. |
| Styling | **Tailwind CSS** + wenige eigene Basiskomponenten | Schnell, konsistent, kein schweres UI-Framework nötig. |
| Validierung | **Zod** | Prüft beim Build jede Inhaltsdatei: fehlende IDs, tote Verweise, falsche Felder → Build schlägt fehl statt Techniker sieht kaputten Schritt. |
| Inhalte (Phase 2–5) | **JSON/YAML-Dateien im Repo** (`content/`) | Versioniert, per Pull Request prüfbar = automatisch eine fachliche Freigabe-Historie. Kein Datenbank-Setup nötig. |
| Datenbank (nur falls Admin-Editor, Phase 6) | **Supabase** (Postgres, Storage) | Inhalte über Formulare pflegen, Medien hochladen. Login nur für Admins. Bis dahin: keine Datenbank. |
| Einsatz-Zustand | **lokal im Browser** (localStorage) | „Keine verlorenen Eingaben“ – auch bei Neuladen der Seite oder Browser-Neustart. Kein Server nötig. |
| Bilder | **statisch im Repo** (`public/medien/`) mit Next.js-Bildoptimierung | Beispielbilder ohne Upload-Infrastruktur; schnell geladen auch bei mäßigem Mobilfunk. |
| Hosting | **Vercel** | Jeder Pull Request bekommt automatisch eine eigene Vorschau-URL zum Testen am Handy. |
| Tests | **Vitest** für Engine & Inhaltsprüfung, später Playwright für Klickpfade | Die Engine ist der kritische Teil – sie wird mit Tests abgesichert. |

**Bewusst nicht** am Anfang: eigener Backend-Server, Microservices, Redux, externes Headless-CMS, native App. Alles davon wäre jetzt Komplexität ohne Nutzen.

**Hinweis zur Next.js-Version:** Das Repo nutzt Next.js 16 mit `cacheComponents`. Einige APIs weichen von älteren Tutorials ab (siehe `AGENTS.md`); wir halten uns an die mitgelieferte Doku in `node_modules/next/dist/docs/`.

---

## 2. Projekt- und Dateistruktur

```
exakt/
├─ app/                          # Routen (nur Seiten & Layouts, keine Fachlogik)
│  ├─ (techniker)/               # mobile Layout-Gruppe
│  │  └─ [kunde]/
│  │     ├─ page.tsx             # Startseite Kunde: „Service starten“ / „Leitfäden“
│  │     └─ einsatz/[einsatzId]/[schritt]/page.tsx
│  ├─ (innendienst)/             # Desktop-Layout-Gruppe
│  │  └─ innendienst/[kunde]/[system]/[hersteller]/...
│  └─ admin/                     # später (Phase 6)
│
├─ src/
│  ├─ engine/                    # Diagnose-Engine – reines TypeScript, KEIN React
│  │  ├─ types.ts                # Knoten, Antworten, Abläufe
│  │  ├─ run.ts                  # nächster Schritt, zurück, korrigieren
│  │  ├─ validate.ts             # tote Verweise, unerreichbare Knoten, Endlosschleifen
│  │  └─ run.test.ts
│  ├─ content/                   # Zugriff auf Inhalte (Schnittstelle!)
│  │  ├─ schema.ts               # Zod-Schemas = verbindliche Datenstruktur
│  │  ├─ repository.ts           # Interface: getSystem(), getFlow(), …
│  │  ├─ file-repository.ts      # Phase 2–5: liest content/
│  │  └─ supabase-repository.ts  # Phase 6: liest Datenbank
│  ├─ einsatz/                   # Zustand eines laufenden Einsatzes (Speichern/Laden)
│  ├─ components/
│  │  ├─ ui/                     # Button, Card, Badge, Checklist … (dumm, wiederverwendbar)
│  │  ├─ blocks/                 # Inhaltsblöcke: Text, Warnung, Sicherheit, Bild, Video, PDF
│  │  ├─ techniker/              # Stepper, Prüfkarte, Antwortleiste
│  │  └─ innendienst/            # Baumansicht, Ablaufgraph, Handbuch
│  └─ lib/
│
├─ content/                      # FACHINHALTE – hier arbeiten später auch Nicht-Entwickler
│  └─ lidl/
│     ├─ kunde.yaml              # Name, Anmeldehinweise, Hinweise Abmelde-/Doku-App
│     └─ service/
│        └─ zigarettentraeger/
│           ├─ system.yaml
│           └─ nera/
│              ├─ vorbereitung.yaml
│              ├─ fehlerbilder.yaml
│              ├─ funktionstest.yaml
│              ├─ diagnose/
│              │  └─ faehrt-nicht-auf.yaml
│              ├─ rueckwaerts/
│              └─ reparatur/
│                 └─ motor-tauschen.yaml
│
├─ public/medien/                # Beispielbilder, PDFs (gleiche Ordnerlogik wie content/)
├─ docs/                         # Konzept, Entscheidungen, Inhaltsanleitung
└─ CLAUDE.md                     # Projektkontext für Claude Code – unabhängig von einem Chat
```

Regel: **eine Datei = ein Ablauf / ein Leitfaden.** Bei 100 Systemen hat man 100 Ordner, aber nie eine Riesendatei.

---

## 3. Datenmodell

### 3.1 Hierarchie

```
Kunde ─┬─ Servicebereich ─┬─ System ─┬─ Variante (System × Hersteller)  ← hier hängen die Inhalte
       │                  │          │    ├─ Vorbereitung (Material, Werkzeug, Messgeräte, Hinweise)
       │                  │          │    ├─ Fehlerbilder ──→ verweisen auf Diagnoseabläufe
       │                  │          │    ├─ Abläufe (Funktionstest, Diagnose, Rückwärts, Reparatur)
       │                  │          │    └─ Medien
       └─ Kundenvorgaben (Ankunft/Anmeldung, Sicherheit, Verweis auf Abmelde-/Doku-App)
```

**Warum „Variante“?** Zigarettenträger von NERA und von ITAB haben unterschiedliche Prüfungen. Die Kombination System × Hersteller ist die eigentliche Einheit, für die Inhalte geschrieben werden. Hersteller sind dabei eigenständige Einträge, damit „NERA“ bei einem zweiten Kunden wiederverwendet werden kann.

**Vererbung:** Inhalte können auf Kunden- oder Systemebene definiert und von der Variante überschrieben werden (z. B. Anmeldehinweise gelten für alle Lidl-Einsätze; Werkzeugliste nur für NERA).

### 3.2 Der zentrale Baustein: Ablauf (Flow)

Funktionstest, Fehleranalyse, Rückwärtsverfahren und Reparatur sind **technisch dasselbe**: eine Abfolge von Knoten mit Verzweigungen. Das hält die Engine klein.

```ts
Flow {
  id, typ: "funktionstest" | "diagnose" | "rueckwaerts" | "reparatur"
  titel, startKnoten
  knoten: Knoten[]
  status: "entwurf" | "freigegeben"     // nur freigegebene Inhalte sieht der Techniker ohne Hinweis
  version, freigegebenVon, freigegebenAm
}

Knoten {
  id                       // stabil, z. B. "pruef-steuereinheit-strom"
  art: "frage" | "anweisung" | "checkliste" | "ergebnis"
  titel                    // „Hat die Steuereinheit Strom?“
  inhalt: Block[]          // Anleitung, Bilder, Videos, PDFs, Warnungen
  werkzeug?, material?     // Verweise auf Vorbereitungsliste
  pflicht?: {              // Sicherheitslogik
     bestaetigung: "einfach" | "checkliste" | "messwert"
     text                  // „Anlage spannungsfrei geschaltet und gesichert“
  }
  antworten: [{ label, wert, weiter: KnotenId | Aktion }]
}

// Umsetzung Phase 2: Antworten zeigen immer auf einen Knoten im selben Ablauf.
// Ein Ablauf endet mit einem Knoten art: "ergebnis" (z. B. ergebnis: "reparatur",
// reparatur: "motor-tauschen"). Verbindliches Schema: src/content/schema.ts,
// Anleitung: docs/INHALTE.md

Block = Text | Hinweis | Warnung | Sicherheit | Bild | Video | PDF | Sollwert
```

Rückwärtsverfahren nutzen dieselbe Struktur, haben aber zusätzliche Felder pro Knoten (`komponente`, `erwarteterZustand`, `vorherigeKomponente`), damit der Innendienst die Kette „Endzustand ← Komponente ← Komponente“ als Kette darstellen kann.

### 3.3 Einsatz (laufender Auftrag)

```ts
Einsatz {
  id, kunde, variante, gestartetAm
  aktuellerSchritt                 // 1, 2, 2.1, 3, 3.1 …
  checklisten: { [punktId]: true }
  fehlerbilder: FehlerbildId[]     // Mehrfachauswahl
  verlauf: [{ flowId, knotenId, antwort, zeit }]   // vollständiges Protokoll
  ergebnisFunktionstest: { vorher, nachher[] }
}
```

Der Verlauf ist der Schlüssel für vieles: Zurück-Funktion, Korrektur, Anzeige „welchen Weg hat der Techniker genommen“ und später Auswertungen (welche Fehler treten wo auf).

Der Einsatz bleibt im Browser des Technikers gespeichert. Da kein Login und keine Fotos vorgesehen sind, verlassen keine Einsatzdaten das Gerät.

### 3.4 Spätere Datenbank (nur falls Admin-Editor)

Dieselben Strukturen als Tabellen: `kunden`, `servicebereiche`, `systeme`, `hersteller`, `varianten`, `fehlerbilder`, `flows`, `knoten`, `antworten`, `medien`. Jede Inhaltstabelle hat `kunde_id`, damit Kunden sauber getrennt bleiben. Lesen ist öffentlich, Schreiben nur für angemeldete Admins.

---

## 4. Der interaktive Entscheidungsbaum

### 4.1 So arbeitet die Engine

```
startKnoten → Techniker antwortet → Engine schaut in antworten[].weiter
    ├─ weiter = Knoten-ID   → nächster Knoten anzeigen
    ├─ weiter = zuFlow      → Reparaturleitfaden öffnen, danach Rücksprung
    └─ weiter = ergebnis    → Diagnoseende (behoben / Reparatur / Eskalation)
```

Die Engine ist eine **reine Funktion**: `(Flow, Verlauf) → aktueller Knoten`. Sie hat keinen eigenen Zustand, deshalb sind diese Dinge trivial:

- **Zurück:** letzten Verlaufseintrag entfernen.
- **Antwort korrigieren:** zum Eintrag springen, alles danach verwerfen, neu antworten. Der neue Pfad ergibt sich automatisch.
- **Innendienst „durchspielen“:** derselbe Code, nur ohne Speichern.

### 4.2 Antworten

Standard: **Ja / Nein / Prüfung nicht möglich**. Beliebige weitere Antworten sind erlaubt (z. B. Messwert-Bereiche „< 20 V / 20–26 V / > 26 V“). „Prüfung nicht möglich“ führt immer irgendwohin – notfalls zur Eskalation. Es gibt keine Sackgassen.

### 4.3 Mehrere Fehlerbilder

Wählt der Techniker zwei Fehlerbilder, werden die Diagnosen **nacheinander** abgearbeitet. Ist ein Fehlerbild bereits durch eine Reparatur erledigt, fragt die App: „Fehlerbild B noch vorhanden?“ – vor dem zweiten Durchlauf.

### 4.4 Qualitätssicherung der Bäume (automatisch beim Build)

`validate.ts` prüft jeden Ablauf und bricht den Build ab bei:

- Verweis auf nicht existierenden Knoten oder Flow
- Knoten ohne Ausgang (außer `ergebnis`)
- Knoten, die vom Start aus nicht erreichbar sind
- Schleifen ohne Ausweg
- Sicherheitsknoten ohne Pflichtbestätigung

Dadurch kann ein Tippfehler in einer Inhaltsdatei nie live einen Techniker in eine Sackgasse schicken.

### 4.5 Sicherheitslogik

- **Pflichtbestätigung:** Weiter-Button bleibt gesperrt, bis z. B. „Spannungsfrei geschaltet“ bestätigt ist. Kein Überspringen per Antwort.
- **Funktionstest nach Reparatur ist erzwungen:** Schritt 6/7 ist erst erreichbar, wenn der Nachtest abgeschlossen ist. Ergebnis „nicht erfolgreich“ / „teilweise“ führt zurück in die Diagnose (mit Vermerk der bereits durchgeführten Reparatur).
- **Eskalation:** eigener Ergebnistyp mit Anzeige, wen man anruft und was man durchgeben soll (inkl. Kurzprotokoll des Verlaufs zum Vorlesen oder Teilen).
- **Entwurfskennzeichnung:** Nicht freigegebene Inhalte tragen sichtbar den Hinweis „Demo / nicht fachlich freigegeben“.

---

## 5. Technikeroberfläche (Mobile-first)

### Ablauf

```
Start (Kunde)  →  Service starten  →  System  →  Hersteller
   → 1 Vorbereitung   (Checkliste Werkzeug/Material/Teile, abhakbar)
   → 2 Ankunft        (Kundenvorgaben, Sicherheitsbestätigung)
   → 2.1 Aufnahme     (Fehlerbilder Mehrfachauswahl, Ist-Zustand per Auswahl, Notiz – keine Fotos)
   → 3 Funktionstest  (geführt, Knoten für Knoten)
   → 3.1 Fehleranalyse / 3.2 Rückwärtsverfahren (falls vorhanden)
   → 4 Reparatur      (Leitfaden Schritt für Schritt)
   → 5 Funktionstest  (Pflicht)  ── nicht ok ──→ zurück zu 3.1
   → 6 Abmeldung      (Hinweis + Link/Verweis auf bestehende App)
   → 7 Dokumentation  (Hinweis + Verweis) → Abschluss
```

### Bildschirmaufbau (eine Prüfung)

```
┌──────────────────────────────┐
│ ‹  Fehleranalyse     3.1  ▓▓░ │  ← kompakter Kopf: Zurück, Schritt, Fortschritt
├──────────────────────────────┤
│ PRÜFUNG 2                     │
│ Dreht der Motor?              │  ← eine Frage, groß
│                               │
│ ▸ Anleitung anzeigen          │  ← Details einklappbar
│ ⚠ Quetschgefahr am Schlitten  │  ← Warnungen immer sichtbar
│ [Bild]                        │
├──────────────────────────────┤
│ [   ✓ Ja   ] [   ✕ Nein   ]   │  ← Daumenzone, min. 56 px hoch
│ [   Prüfung nicht möglich   ] │
└──────────────────────────────┘
```

- Antwortbuttons **immer unten** (Einhandbedienung).
- Maximal eine Frage pro Bildschirm.
- „Verlauf“-Schublade zeigt bisherige Antworten; Tippen = korrigieren.
- Einsatz wird nach jeder Eingabe lokal gespeichert; beim Öffnen: „Einsatz fortsetzen?“.
- „Leitfäden“ auf der Startseite: freies Nachschlagen ohne Einsatz.

---

## 6. Innendienstoberfläche (Desktop)

### Layout

```
┌────────────────┬──────────────────────────────────────┬─────────────────┐
│ Navigation     │ Inhalt                               │ Kontext         │
│ Lidl           │ Fehleranalyse: Fährt nicht auf       │ Werkzeug        │
│  └ Service     │                                      │ Ersatzteile     │
│    └ Zig.träger│  [Ablaufgraph]  [Liste]  [Simulieren]│ Sollwerte       │
│      └ NERA    │                                      │ Medien          │
│        Vorber. │  Prüfung 1 ──Ja──▶ Prüfung 2         │                 │
│        Ankunft │      └─Nein─▶ Spannungsversorgung    │                 │
│        Fehler… │                                      │                 │
└────────────────┴──────────────────────────────────────┴─────────────────┘
```

Drei Darstellungen desselben Ablaufs:

1. **Ablaufgraph** – alle Knoten und Verzweigungen auf einen Blick (zoombar).
2. **Liste / Handbuch** – jede Prüfung mit allen Antworten und „→ weiter zu Prüfung X“, nummeriert, durchsuchbar. Druck- und später PDF-fähig.
3. **Simulieren** – der Innendienst klickt dieselben Antworten wie der Techniker am Telefon und sieht exakt dessen Bildschirm. Das ist im Support-Alltag vermutlich die wertvollste Funktion.

**Handbuchversion:** Wird automatisch aus den Daten erzeugt (`/innendienst/.../handbuch`). Kein separates Dokument, das veralten kann.

**Abgleich am Telefon:** Da Einsätze nur im Gerät des Technikers liegen, sieht der Innendienst sie nicht automatisch. Stattdessen zeigt die Technikeransicht jederzeit eine kurze **Verlaufszusammenfassung** („P1 Strom: Ja → P2 Motor dreht: Nein → …“), die vorgelesen oder per Messenger geteilt werden kann. Der Innendienst stellt denselben Stand in der Simulation nach.

---

## 7. Navigation & URLs

| URL | Zweck |
|---|---|
| `/` | Kundenauswahl (anfangs direkt Weiterleitung auf Lidl) |
| `/lidl` | Start: „Service starten“, „Leitfäden“, ggf. „Einsatz fortsetzen“ |
| `/lidl/einsatz/neu` | System → Hersteller wählen |
| `/lidl/einsatz/[id]/[schritt]` | Geführter Ablauf (`vorbereitung`, `ankunft`, `aufnahme`, `funktionstest`, `diagnose`, `rueckwaerts`, `reparatur`, `nachtest`, `abschluss`) |
| `/lidl/leitfaeden/...` | Nachschlagen ohne Einsatz |
| `/innendienst/lidl/zigarettentraeger/nera` | Systemübersicht Innendienst |
| `/innendienst/.../diagnose/[flow]` | Graph / Liste / Simulation |
| `/innendienst/.../handbuch` | Komplette Handbuchansicht |
| `/admin/...` | Phase 6 |

Der Kunde steht immer in der URL – so ist die Mehrkundenfähigkeit von Anfang an eingebaut, ohne dass heute ein zweiter Kunde existiert.

---

## 8. Designkonzept

**Charakter:** ruhige, technische Service-Software. Hell, klar, viel Weißraum, deutliche Hierarchie. Keine Verläufe, keine Deko-Animationen.

- **Schrift:** Inter (gut lesbar, auch klein), Zahlen tabellarisch für Messwerte. Fließtext mobil mind. 16 px, Fragen 22–24 px.
- **Grundfarben:** Neutralgrau (Slate) für Flächen/Text, **Exakt-Gelb** als einzige Akzentfarbe. Kundenfarben nur als kleiner Marker, nicht als Theme, damit die App nicht wie eine Kunden-App aussieht.
- **Umgang mit Gelb:** Gelb ist auf Weiß als Schrift kaum lesbar. Deshalb wird Gelb als **Fläche** eingesetzt (Hauptbuttons, aktiver Schritt, Fortschrittsbalken, Kopfzeilen-Akzent) – immer mit **fast schwarzer Schrift** darauf. Texte und Icons sind nie gelb auf Weiß. Im Dark Mode wirkt Gelb auf Dunkelgrau besonders gut.
- **Abgrenzung zur Warnfarbe:** Weil Gelb die Markenfarbe ist, werden Warnungen in einem deutlich anderen **Orange/Amber mit Icon und Rahmen** dargestellt, damit ein Hauptbutton nie mit einer Warnung verwechselt wird.
- **Semantische Farben** – die wichtigste Designregel, sie sind überall gleich:

| Typ | Farbe | Icon | Verwendung |
|---|---|---|---|
| Information | Blau | ⓘ | Hinweise, Hintergrund |
| Prüfung / Frage | Akzent | ? | Was der Techniker gerade tun soll |
| Warnung | Amber | ⚠ | Achtung, Sachschaden möglich |
| Sicherheit | Rot | ⛔ | Personengefahr, Pflichtbestätigung |
| Ergebnis ok | Grün | ✓ | Funktionstest bestanden, behoben |
| Entwurf | Gestrichelt grau | ✎ | „Nicht fachlich freigegeben“ |

- **Komponenten:** Karten mit dezentem Rand statt Schatten, 12 px Radius, große Touch-Ziele (≥ 48 px), Icons von Lucide.
- **Dark Mode:** sinnvoll für dunkle Lagerräume – wird über Farbtokens von Anfang an vorbereitet.
- **Outdoor-Lesbarkeit:** hohe Kontraste (WCAG AA), keine hellgrauen Texte auf Weiß.

---

## 9. Entwicklungsphasen (angepasst)

Ich würde die Phasen aus dem Briefing leicht umsortieren: **die Engine gehört nach vorne**, weil Serviceablauf und Innendienst darauf aufbauen.

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **1 Konzept** | dieses Dokument, Freigabe durch euch | Klare Entscheidungen |
| **2 Fundament** | Datenschema (Zod), Content-Ordner mit Demo-Inhalt NERA, Engine + Validierung + Tests, CLAUDE.md, README | Daten laufen, Fehler im Inhalt werden erkannt |
| **3 Technikerablauf** | Design-Grundbausteine, alle Schritte 1–7 für den Piloten, lokale Speicherung, Zurück/Korrektur, Pflichtbestätigung, erzwungener Nachtest | **Pilot am Handy durchklickbar** – auf Vercel-Vorschau |
| **4 Innendienst** | Systemübersicht, Liste/Handbuch, Simulation, danach Ablaufgraph | Telefonsupport möglich |
| **5 Echte Inhalte** | Ihr ersetzt Demo-Inhalte NERA durch freigegebene Inhalte; Feedback von 1–2 Technikern im Feld | Erster echter Einsatz |
| **6 Pflege ohne Code** (optional) | Tabellenvorlage/Import-Skript; bei Bedarf Admin-Editor mit Supabase und Admin-Login | Inhalte ohne Code pflegen |
| **7 Ausbau** | ITAB, Kesseböhmer, weitere Systeme, PDF-Export des Handbuchs, weitere Kunden | Skalierung |

Die PWA-Grundlage (Manifest, App-Icon für den Homescreen) kommt schon in Phase 3 dazu – das ist wenig Aufwand.

---

## 10. Zusammenarbeit über GitHub

**Repo:** `Kevin-Exakt/Exakt-Leitfaden` (bereits angelegt).

**Branches**
- `main` = immer lauffähig, wird automatisch auf Vercel veröffentlicht. Geschützt: nur per Pull Request.
- `feature/<thema>` für Code (z. B. `feature/diagnose-engine`)
- `content/<system>` für Inhalte (z. B. `content/nera-faehrt-nicht-auf`)

**Ablauf**
1. Aufgabe als GitHub Issue anlegen (GitHub Projects als Kanban-Board: Offen / In Arbeit / Review / Fertig).
2. Branch erstellen, arbeiten (mit Claude Code), regelmäßig committen.
3. Pull Request öffnen → Vercel baut automatisch eine **Vorschau-URL** → am Handy testen.
4. Die andere Person schaut drüber und gibt frei → Merge in `main`.

**Arbeitsteilung, damit ihr euch nicht in die Quere kommt**
- Person A: Engine, Datenschema, Technikeroberfläche
- Person B: Innendienstoberfläche, Design-Bausteine, Inhalte/Demo-Daten
- Gemeinsam: Schema-Änderungen (betreffen beide) immer kurz absprechen.

**Unabhängig von Claude-Chats:** `CLAUDE.md` im Repo enthält Projektkontext, Konventionen und Entscheidungen. Jede Claude-Code-Sitzung – egal von wem – liest das automatisch. Wichtige Entscheidungen landen zusätzlich als kurze Notiz in `docs/entscheidungen/`.

**Automatische Prüfungen (GitHub Actions):** Lint, Typprüfung, Tests, Inhaltsvalidierung bei jedem Pull Request.

---

## 11. Inhalte pflegen ohne Programmierkenntnisse

Stufenweise – jede Stufe ist sofort nutzbar:

1. **Phase 2–5: Inhaltsdateien (YAML)**
   Lesbar wie ein strukturierter Text, bearbeitbar direkt im GitHub-Browser. Jede Änderung ist ein Pull Request = **dokumentierte fachliche Freigabe** mit Name und Datum. Dazu kommt eine Inhaltsanleitung `docs/INHALTE.md` mit Vorlagen.

2. **Optional als Brücke: Tabellenvorlage**
   Fachleute schreiben einen Diagnosebaum in eine Tabelle (Spalten: Prüf-ID, Frage, Anleitung, „Ja → ID“, „Nein → ID“, „nicht möglich → ID“). Ein Skript wandelt sie in die Inhaltsdatei um und meldet Fehler. Für viele Techniker ist das der natürlichste Weg, einen Baum zu entwerfen.

3. **Ab Phase 6: Admin-Editor in der App**
   Formulare für Systeme, Prüfungen, Antworten; Medien hochladen; **Status Entwurf → Prüfung → Freigegeben**; Vorschau im Simulationsmodus vor der Freigabe. Ein visueller Graph-Editor kann später folgen.

Ein fertiges Headless-CMS (Sanity, Payload, Strapi) empfehle ich **nicht**: Entscheidungsbäume mit Verweisen passen schlecht in deren Formularlogik, und man hätte ein weiteres System zu pflegen. Der eigene Editor arbeitet direkt mit dem Schema, das die Engine ohnehin nutzt.

---

## 12. Weg zur mobilen App

| Stufe | Was | Aufwand |
|---|---|---|
| **PWA** (empfohlen, Phase 3) | App-Icon auf dem Homescreen, Vollbild ohne Browserleiste | gering |
| **Capacitor-Hülle** | Dieselbe Webapp im App-Store-Container; nur nötig, wenn ihr App-Store-Verteilung, MDM-Verwaltung oder tiefe Geräte-Funktionen braucht | mittel |
| **Native (React Native/Expo)** | Neue Oberfläche, aber Engine, Schema und Inhalte werden 1:1 wiederverwendet, weil sie kein React/Next enthalten | hoch |

Genau deshalb liegen Engine und Schema in `src/engine` bzw. `src/content` ohne Abhängigkeit zu Next.js – dieser Teil ist das eigentliche Kapital des Projekts und überlebt jeden Oberflächenwechsel.

---

## 13. Zugang ohne Login – was das bedeutet

- Jeder mit dem Link kann Techniker- **und** Innendienstansicht öffnen. Beides ist bewusst gewollt.
- Alle Seiten bekommen `noindex` und eine `robots.txt`, die Suchmaschinen aussperrt. So taucht die App nicht bei Google auf. Ein echter Schutz ist das nicht: Wer den Link weitergibt, gibt auch den Zugang weiter.
- Deshalb sollten **keine vertraulichen Inhalte** hinein (z. B. interne Telefonnummern, Kundenzugangscodes, Preise). Diese gehören weiterhin in eure bestehenden Apps.
- Sollte sich das ändern, lässt sich später ein einfacher Schutz nachrüsten (z. B. Passwortschutz über Vercel oder ein gemeinsamer Zugangscode), ohne die App umzubauen.

---

## 14. Offene Fragen an euch

1. **Logo:** wird nachgereicht (am besten als SVG, sonst PNG mit transparentem Hintergrund).

~~Fotos~~, ~~Login~~, ~~Offline~~, ~~Name~~, ~~Abmelde-/Doku-Link~~, ~~Freigabe~~, ~~Sprache~~, ~~Farbe~~ – entschieden, siehe Abschnitt 0.

---

**Nächster Schritt:** Eure Rückmeldung zu diesem Konzept und den offenen Fragen. Danach starte ich mit Phase 2 (Datenschema, Demo-Inhalt NERA, Engine mit Tests).
