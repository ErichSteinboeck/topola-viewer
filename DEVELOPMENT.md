# Topola Viewer – Entwicklungsstand

**Stand: 22. November 2026**  
**Repository:** https://github.com/ErichSteinboeck/topola-viewer  
**GitHub Pages:** https://erichsteinboeck.github.io/topola-viewer/

Diese Datei ist die **dauerhafte Übergabe zwischen Gesprächen**. Sie unterscheidet ausdrücklich zwischen implementierten Funktionen, noch offenen Wünschen und nicht getroffenen Entscheidungen. Vor weiteren Änderungen immer den aktuellen Quellcode prüfen.

## Ziel und Datenherkunft

- Öffentlich verständliche Darstellung historischer Familienforschung ohne MyHeritage-Konto; interaktive Diagramme, Ereignisse, Matricula-Links und Quellen.
- **Recherche-TXT ist die maßgebliche Arbeitsgrundlage**; MyHeritage-Stammbaum und GEDCOM sind daraus abgeleitet. Abweichungen TXT/GEDCOM als mögliche Übertragungsfehler prüfen.
- GEDCOM bleibt austauschbare Datenquelle. Der Fork arbeitet auf `master`; GitHub Pages wird per GitHub Actions veröffentlicht.
- Orientierung und nachvollziehbare Vorfahrenlinien sind wichtiger als möglichst viele Verwandte gleichzeitig anzuzeigen.

## Daten und Beispiele

- `public/examples/wienfluss-huber.ged`: Beispiel mit Mathilde Huber als gewünschter Startperson (`I500003`).
- `public/examples/reinhold-halmenschlager.ged` **und** `.zip` liegen **bereits** im öffentlichen Repository. Vor einem Update Inhalt, Privatsphäre und URLs überprüfen.
- Neuester im Gespräch angehängter MyHeritage-Export: `halmenschlager-20261121(1).ged` (Exportdatum 21.11.2026; 44 Personen, 22 Familien; Reinhold `I500003`). Nicht automatisch identisch mit der veröffentlichten Fassung.
- **Datenschutz:** Das vollständige Forschungsoriginal nicht ungeprüft publizieren. Daten lebender Personen vor Veröffentlichung einer separaten Kopie prüfen/gegebenenfalls entfernen.

## Implementierter Stand (vor weiteren Arbeiten im Code verifizieren)

- Sanduhr, „Alle Verwandte“, Vorfahrenfächer und weitere bisherige Topola-Diagrammtypen sind im Code vorhanden.
- Standard-Klick zeigt Personendetails, Shift-Klick richtet das Diagramm aus; umkehrbar in Einstellungen.
- Personen-/Volltextsuche, `/`-Tastenkürzel und HTML-Entity-Dekodierung in der Suche.
- Deutsch und weitere Sprachen, Notiz-HTML und Matricula-Links, steuerbare Ereignisnotizen, technische Felder.
- Robusterer MyHeritage-GEDCOM-Import mit Parser-/Reparaturhinweisen.
- Orts-Hover mit Vergleich vollständiger (ggf. zusammengesetzter) GEDCOM-Ortsangaben.
- **Vorfahrenfächer** (`view=fan`): 240° mit Öffnung unten, bis zwölf Vorfahrengenerationen, unbekannte Vorfahren nicht gezeichnet, bekannte Ahnen behalten ihre Position. Zoomen, Verschieben, Einpassen, Heiratsmarkierungen, Personen-Popups, Export, Namensumbruch/Initialen.
- Viele Zwischenstände wurden praktisch im Benutzerbrowser getestet. Für neuere Einzeländerungen gilt das nicht automatisch.

## Offene Änderungen aus der letzten Besprechung

### Menü und Personenauswahl

- In **Ansicht** `Donatso` und `Zierbaum` **nur ausblenden**, ihren Code behalten.
- **Alle Verwandte** beibehalten; Arbeitstitel „Sanduhrkarte (alle Verwandten)“, endgültige Bezeichnung noch offen.
- Startperson nicht automatisch gleich dem ersten GEDCOM-Datensatz/`I500001`. Vereinbarte Präferenz: URL-Parameter `indi` zuerst, dann eindeutiger Name aus dem GEDCOM-Dateinamen (z. B. `reinhold-halmenschlager.ged`), danach sinnvoller Fallback für fremde Dateien.
- Eine Heuristik „Person mit den meisten sichtbaren Verwandten“ ist **diskutiert, aber nicht beschlossen**. Bei einer fremden Datei muss es einen verständlichen Ausgangspunkt geben.
- **Navigationsproblem:** Auswahl eines Suchtreffers kann lediglich die Seitenleiste ändern, während die Person im Fächer weiterhin nicht sichtbar ist. Auswahl, Fokus und Neuausrichtung diagrammübergreifend konsistent machen.

### Seitenleiste und Einstellungen

- Tab `INFORMATIONEN` → **DETAILS**.
- Bei fehlerfreiem GEDCOM-Import keine Erfolgsmitteilung; Warnmeldungen mit korrektem linken Einzug.
- **SPRACHE** oberhalb **DATENQUELLE**, zusätzliche Einstellungen ans Ende nach **ORTE**.
- Checkboxen benennen: **Klick / Shift-Klick umkehren**; **Identische Orte hervorheben**; **Felder RIN, UID, UPD verbergen**; **Feld IDENTIFIKATION verbergen**.
- Bei den beiden letzten gilt **angekreuzt = verborgen**, einschließlich richtiger Defaults und Migration bisher gespeicherter Einstellungen.

### Darstellung und gemeinsame Popups

- Schriftfamilie, Basisfarben, Auswahl- und Ortsmarkierung über Diagramme hinweg vereinheitlichen; Schriftgrößen dürfen bei engen Segmenten variieren.
- Keine Namens-Glyphen-Komprimierung im Fächer (`textLength`/`spacingAndGlyphs`); Umbruch und Vornameninitialen verwenden.
- Feld `IDENTIFIKATION` im Fächer bei Anzeige unten und klein setzen; Mittelpunkt um Tod und Geburts-/Sterbeorte ergänzen.
- Ortsmarkierung nur farblich, **nicht fett** (verhindert optisches Springen); normalen Hand-Cursor beibehalten.
- Gemeinsame Popup-Komponente und Datenaufbereitung für Sanduhr/Fächer: Geburt/Taufe, Heirat, Tod/Beerdigung, allgemeine GEDCOM-Felder und **sicher gerendertes NOTE-HTML** mit Links.
- Wenn Popups zu groß werden, in separate Ereignis-Popups aufteilen und Notizen begrenzen; vollständige Informationen in DETAILS belassen.

## Deployment und Workflows

- `.github/workflows/pages.yml` baut und veröffentlicht GitHub Pages aus `master`.
- `.github/workflows/node.js.yml` führt Format-, Lint-, Build-, Unit- und Browserprüfungen aus. Playwright war wiederholt fehlerhaft; bei jedem Lauf tatsächliche Logs prüfen.
- Vier **täglich** getriggerte Workflows (jeweils `schedule: cron: '0 5 * * *'`): **Prober - GitHub Pages**, **Prober - WikiTree**, **Prober - WikiTree CORS**, **Prober - Docker**. Sie liefen unabhängig von Commits und schlugen zuletzt fehl. Ob und welche wir deaktivieren, ist noch zu entscheiden.
- GEDCOM/ZIP bleiben bei Updates am selben Pfad in `public/examples/`. Vorgehen: geprüfte öffentliche Kopie erzeugen, Dateien ersetzen, Commit/Push, Deployment prüfen, Abruf von GEDCOM und ZIP per URL testen.

## Vorgesehene Arbeitsfolge

1. Einfache Menü-/Einstellungs-/Tab-Änderungen.
2. Startperson und Such-/Fokusnavigation entwerfen und testen.
3. Gemeinsamer Diagrammstil, IDENTIFIKATION und Ortsmarkierung.
4. Gemeinsame Popups mit ergänzenden GEDCOM-Daten und gekürzten HTML-Notizen.
5. Neueste GEDCOM gegen veröffentlichte GED/ZIP-Dateien vergleichen, Datenschutz überprüfen, ggf. aktualisieren.
6. Zeitgesteuerte Prober prüfen und bei Bedarf einschränken/deaktivieren.

## Fortsetzung in einem neuen Chat

> Wir arbeiten an `ErichSteinboeck/topola-viewer`. Bitte zuerst `DEVELOPMENT.md` und den aktuellen Code lesen. Die Forschungs-TXT ist die Recherchegrundlage; GEDCOM ist MyHeritage-Export. Unser Vorfahrenfächer ist bereits implementiert. Offen sind die beschlossenen UI-Anpassungen, die noch nicht entschiedene automatische Hauptperson-Auswahl, diagrammübergreifendes Auswahlverhalten und gemeinsame Popups. Die neueste hochgeladene GEDCOM vom 21.11.2026 darf nicht ohne Datenschutz-/Versionsprüfung die bereits veröffentlichte Kopie ersetzen.

**Pflege:** Nach jedem abgeschlossenen Entwicklungsschritt Status und offene Entscheidungen hier aktualisieren.
