# Inhalte schreiben

Alle Fachinhalte liegen als YAML-Dateien unter `content/`. YAML ist strukturierter Text –
Einrückung (2 Leerzeichen) ist wichtig, Tabs sind nicht erlaubt.

Nach jeder Änderung: `npm run validate`. Die Prüfung zeigt Datei und Stelle jedes Fehlers.
Im Pull Request läuft sie automatisch.

## Ordnerstruktur

```
content/
├─ hersteller.yaml                         alle Hersteller (ITAB, NERA, Kesseböhmer …)
├─ instaserve/ iris/ retec/ rowius/       weitere Auftraggeber (je eine auftraggeber.yaml)
└─ pan-oston/                              Auftraggeber (Ordnername = ID)
   ├─ auftraggeber.yaml                    Name, Links Abmeldung/Doku, optional Ankunft
   └─ lidl/                                Kunde des Auftraggebers
      ├─ kunde.yaml                        Name, optional eigene Ankunft-Checkliste
      └─ zigarettentraeger/                System
         ├─ system.yaml
         └─ nera/                          Hersteller-Variante
            ├─ variante.yaml               Fehlerbilder, welcher Funktionstest
            ├─ vorbereitung.yaml           Werkzeug, Messgeräte, Material, Ersatzteile, Dokumente
            ├─ funktionstest/*.yaml        Abläufe – Ordnernamen frei wählbar,
            ├─ diagnose/*.yaml             der Typ steht in der Datei.
            ├─ rueckwaerts/*.yaml          Dateiname = ID des Ablaufs
            └─ reparatur/*.yaml
```

**IDs** (Ordner, Dateinamen, `id:`-Felder): nur Kleinbuchstaben, Ziffern, Bindestriche.
Umlaute ausschreiben: `faehrt-nicht-auf`, `kessebohmer`.

**Neuen Auftraggeber anlegen:** Ordner unter `content/` mit `auftraggeber.yaml` (`name`, `links`).
Erscheint sofort in der Auftraggeber-Auswahl.

**Neuen Kunden anlegen:** Ordner unter dem Auftraggeber mit `kunde.yaml` (`name`).

**Auftraggeber ohne eigene Kunden** (z. B. Retec): genau einen Kundenordner anlegen
(`content/retec/direkt/`). Hat ein Auftraggeber nur einen Kunden, überspringt die App
die Kundenauswahl und zeigt direkt die Systeme.

**Ankunft (Step 2):** Steht `ankunft:` in `kunde.yaml`, gilt sie für diesen Kunden
(z. B. Anmeldung im Lidl-Markt). Sonst gilt `ankunft:` aus `auftraggeber.yaml`.

**Hersteller ohne Leitfaden:** Es reicht eine `variante.yaml` mit `hersteller:` und `status: entwurf`.
Die App zeigt dann „Leitfaden folgt“. Sobald `funktionstest:` und `fehlerbilder:` eingetragen sind,
startet der Leitfaden.

**Mehrere Varianten eines Herstellers** (z. B. Kesseböhmer Alt / Neu): je ein Ordner
(`kessebohmer-alt/`, `kessebohmer-neu/`) mit `hersteller: kessebohmer` und `name: Kesseböhmer Alt`.

**Neuen Hersteller anlegen:** Ordner `nera/` kopieren, umbenennen (z. B. `itab/`),
`hersteller:` in `variante.yaml` anpassen, Inhalte ersetzen.

## Ein Ablauf

Funktionstest, Diagnose, Rückwärtsverfahren und Reparatur sind gleich aufgebaut:
eine Liste von **Knoten**. Jede Antwort zeigt mit `weiter:` auf den nächsten Knoten.

```yaml
typ: diagnose            # funktionstest | diagnose | rueckwaerts | reparatur
titel: Fährt nicht auf
status: entwurf          # entwurf | freigegeben
version: 1
start: steuereinheit-strom

knoten:
  - id: steuereinheit-strom
    art: frage                    # frage | anweisung | ergebnis
    titel: Hat die Steuereinheit Strom?
    benoetigt: [messgeraet-demo]  # IDs aus vorbereitung.yaml
    inhalt:
      - typ: text
        text: Ausführliche Prüfanleitung …
      - typ: bild
        src: /medien/pan-oston/lidl/nera/steuereinheit.jpg
        alt: Steuereinheit von vorne
    antworten:
      - { label: "Ja",   typ: ja,   weiter: motor-dreht }
      - { label: "Nein", typ: nein, weiter: spannungsversorgung }
      - { label: "Prüfung nicht möglich", typ: nicht-moeglich, weiter: eskalation }

  - id: motor-tauschen
    art: ergebnis
    ergebnis: reparatur
    reparatur: motor-tauschen     # Dateiname des Reparaturleitfadens
    titel: Motor austauschen
```

### Antworten

- `typ: ja | nein | nicht-moeglich` färbt den Button passend und ist zugleich die ID.
- Andere Antworten (`typ` weglassen) brauchen bei Mehrdeutigkeit eine eigene `id:`.

### Ergebnisse (Ende eines Ablaufs)

| Ablauftyp | erlaubte `ergebnis:` |
|---|---|
| funktionstest | `bestanden`, `nicht-bestanden`, `teilweise`, `eskalation` |
| diagnose, rueckwaerts | `reparatur` (+ `reparatur: <id>`), `behoben`, `kein-befund`, `eskalation` |
| reparatur | `abgeschlossen`, `eskalation` |

### Pflichtbestätigung (Sicherheit)

Knoten mit einem Block `typ: sicherheit` **müssen** eine Pflichtbestätigung haben.
Die Antworten bleiben gesperrt, bis alles abgehakt ist.

```yaml
pflicht:
  text: Anlage spannungsfrei geschaltet und gesichert
  punkte:
    - Hauptschalter aus
    - gegen Wiedereinschalten gesichert
```

### Inhaltsblöcke

| `typ` | Felder |
|---|---|
| `text` | `text` |
| `hinweis`, `warnung`, `sicherheit` | `text`, optional `titel` |
| `bild` | `src` (`/medien/…`), `alt`, optional `beschriftung`, `beispiel: false` bei echten Fotos |
| `video`, `pdf` | `titel`, `src` (`/medien/…` oder `https://…`) |
| `sollwert` | `bezeichnung`, `wert`, optional `einheit` |

Mediendateien liegen unter `public/medien/` (z. B. `public/medien/pan-oston/lidl/nera/motor.jpg`,
im Inhalt dann `src: /medien/pan-oston/lidl/nera/motor.jpg`).

### Rückwärtsverfahren

Zusätzlich pro Knoten: `komponente:` und `erwarteterZustand:`.

## Was die Prüfung automatisch findet

- Tippfehler in Feldnamen, falsche Werte, fehlende Pflichtfelder
- Antworten, die auf nicht existierende Knoten zeigen
- Knoten ohne Ausweg, Endlosschleifen, nicht erreichbare Knoten (Warnung)
- Fehlerbilder/Ergebnisse, die auf fehlende oder falsche Abläufe zeigen
- fehlende Bilddateien
- Sicherheitshinweise ohne Pflichtbestätigung

## Freigabe

1. Neuen Branch `content/<thema>` anlegen, Inhalte bearbeiten, `status: entwurf`.
2. Pull Request öffnen – die andere Person prüft fachlich.
3. Bei Freigabe: `status: freigegeben` und
   ```yaml
   freigabe:
     von: Name
     am: 2026-11-20
   ```
4. Bei späteren Änderungen `version` erhöhen.
