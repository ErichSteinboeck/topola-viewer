# Topola Viewer – Entwicklungsstand

**Stand: 22. November 2026**  
**Repository:** https://github.com/ErichSteinboeck/topola-viewer  
**GitHub Pages:** https://erichsteinboeck.github.io/topola-viewer/

Diese Datei ist die **dauerhafte Übergabe zwischen Gesprächen**. Sie
unterscheidet ausdrücklich zwischen implementierten Funktionen, noch offenen
Wünschen und nicht getroffenen Entscheidungen. Vor weiteren Änderungen immer den
aktuellen Quellcode prüfen.

## Ziel und Datenherkunft

- Öffentlich verständliche Darstellung historischer Familienforschung ohne
  MyHeritage-Konto; interaktive Diagramme, Ereignisse, Matricula-Links und
  Quellen.
- **Recherche-TXT ist die maßgebliche Arbeitsgrundlage**; MyHeritage-Stammbaum
  und GEDCOM sind daraus abgeleitet. Abweichungen TXT/GEDCOM als mögliche
  Übertragungsfehler prüfen.
- GEDCOM bleibt austauschbare Datenquelle. Der Fork arbeitet auf `master`;
  GitHub Pages wird per GitHub Actions veröffentlicht.
- Orientierung und nachvollziehbare Vorfahrenlinien sind wichtiger als möglichst
  viele Verwandte gleichzeitig anzuzeigen.

## Daten und Beispiele

- `public/examples/wienfluss-huber.ged`: Beispiel mit Mathilde Huber als
  gewünschter Startperson (`I500003`).
- `public/examples/reinhold-halmenschlager.ged` **und** `.zip` liegen
  **bereits** im öffentlichen Repository. Vor einem Update Inhalt, Privatsphäre
  und URLs überprüfen.
- Neuester im Gespräch angehängter MyHeritage-Export:
  `halmenschlager-20261121(1).ged` (Exportdatum 21.11.2026; 44 Personen, 22
  Familien; Reinhold `I500003`). Nicht automatisch identisch mit der
  veröffentlichten Fassung.
- **Datenschutz:** Das vollständige Forschungsoriginal nicht ungeprüft
  publizieren. Daten lebender Personen vor Veröffentlichung einer separaten
  Kopie prüfen/gegebenenfalls entfernen.

## Implementierter Stand (vor weiteren Arbeiten im Code verifizieren)

- Sanduhr, „Alle Verwandte“, Vorfahrenfächer und weitere bisherige
  Topola-Diagrammtypen sind im Code vorhanden.
- Standard-Klick zeigt Personendetails, Shift-Klick richtet das Diagramm aus;
  umkehrbar in Einstellungen.
- Personen-/Volltextsuche, `/`-Tastenkürzel und HTML-Entity-Dekodierung in der
  Suche.
- Deutsch und weitere Sprachen, Notiz-HTML und Matricula-Links, steuerbare
  Ereignisnotizen, technische Felder.
- Robusterer MyHeritage-GEDCOM-Import mit Parser-/Reparaturhinweisen.
- Orts-Hover mit Vergleich vollständiger (ggf. zusammengesetzter)
  GEDCOM-Ortsangaben.
- **Vorfahrenfächer** (`view=fan`): 240° mit Öffnung unten, bis zwölf
  Vorfahrengenerationen, unbekannte Vorfahren nicht gezeichnet, bekannte Ahnen
  behalten ihre Position. Zoomen, Verschieben, Einpassen, Heiratsmarkierungen,
  Personen-Popups, Export, Namensumbruch/Initialen.
- Viele Zwischenstände wurden praktisch im Benutzerbrowser getestet. Für neuere
  Einzeländerungen gilt das nicht automatisch.

## Offene Änderungen aus der letzten Besprechung

### Menü und Personenauswahl

- **Erledigt 22.11.2026:** Unter **Ansicht** sind `Donatso` und `Zierbaum`
  (intern `fancy`) ausgeblendet; beide bleiben im Code und über bestehende
  `view=`-Links erreichbar.
- **Erledigt 22.11.2026:** **Alle Verwandten** bleibt als „Sanduhrkarte (alle
  Verwandten)“ im Menü.
- Startperson nicht automatisch gleich dem ersten GEDCOM-Datensatz/`I500001`.
  Vereinbarte Präferenz: URL-Parameter `indi` zuerst, dann eindeutiger Name aus
  dem GEDCOM-Dateinamen (z. B. `reinhold-halmenschlager.ged`), danach sinnvoller
  Fallback für fremde Dateien.
- Eine Heuristik „Person mit den meisten sichtbaren Verwandten“ ist
  **diskutiert, aber nicht beschlossen**. Bei einer fremden Datei muss es einen
  verständlichen Ausgangspunkt geben.
- **Navigationsproblem:** Auswahl eines Suchtreffers kann lediglich die
  Seitenleiste ändern, während die Person im Fächer weiterhin nicht sichtbar
  ist. Auswahl, Fokus und Neuausrichtung diagrammübergreifend konsistent machen.
- **Weitere Idee (nicht beschlossen):** Wenn `indi` fehlt und der Dateiname
  keine eindeutig zuordenbare Person enthält, den Benutzer nach der gewünschten
  Startperson fragen, statt ungefragt den ersten Datensatz zu verwenden. Später
  gemeinsam mit Startpersonen-Heuristik entscheiden.

### Seitenleiste und Einstellungen

- **Erledigt 22.11.2026:** Tab `INFORMATIONEN` → **DETAILS**.
- **Erledigt 22.11.2026:** Keine Diagnostikmeldung bei sauberem oder nicht
  verfügbarem Prüfbericht. Relevante GEDCOM-Warnungen sind wie der restliche
  Seitenleisteninhalt eingerückt.
- **Erledigt 22.11.2026:** **SPRACHE** vor **DATENQUELLE**; zusätzliche
  Einstellungen nach **ORTE**.
- **Erledigt 22.11.2026:** Checkboxtexte **Klick / Shift-Klick umkehren**,
  **Identische Orte hervorheben**, **Felder RIN, UID, UPD verbergen** und **Feld
  IDENTIFIKATION verbergen**. Die beiden Verbergen-Checkboxen sind angekreuzt,
  wenn die Felder ausgeblendet sind; Klick/Shift-Klick ist angekreuzt, wenn ein
  normaler Klick fokussiert. Alte URL- und localStorage-Werte (`technical`, `i`,
  `click`) behalten unverändert ihre Bedeutung. Kein Datenmigrationsschritt
  notwendig.

### Darstellung und gemeinsame Popups

- **Überarbeitet 22.11.2026:** Fächer: gleiche Namensschriftgröße innerhalb
  eines Rings; Geburtsdatum, Geburtsort, Sterbedatum, Sterbeort auf eigenen
  Zeilen (Platz wird bedarfsabhängig gekürzt); **innere Ringe gebogen entlang
  des Kreisbogens, äußere radial und gerade**. Beschriftung „Generationen“,
  schmales Zahlenfeld bis zwölf. Klick/Shift-Klick entsprechend der
  konfigurierten Funktion geprüft.
- **Erste Popup-Version 22.11.2026:** Im Fächer separate Ereignisinhalte für
  Geburt/Taufe, Tod/Beerdigung und Heirat, einschließlich gegebenenfalls
  vorhandener sicher gerenderter HTML-Ereignisnotizen. Das Design und die
  Integration in die Sanduhr müssen noch im Browser beurteilt und
  vereinheitlicht werden.

- **Erledigt 22.11.2026 (Diagrammstil):** Gemeinsame Schriftfamilie und
  orangefarbene Auswahlkontur; Ortsmarkierung ohne Fettwechsel und mit normalem
  Hand-Cursor. Fächer ohne Glyphenkomprimierung: lange Namen umbrechen bzw. bei
  Bedarf kleinere normale Schrift verwenden; IDENTIFIKATION als eigene kleine
  untere Zeile und Mittelpunkt um Tod, Geburts- und Sterbeort ergänzt. Die
  Popups bleiben ein separater Arbeitsschritt.
- **Erledigt 22.11.2026:** Beschriftung der Ereignisnotiz-Checkbox auf „Immer
  anzeigen“ verkürzt (Überschrift ist „Ereignisnotizen“).

- **Offen:** Auch in der Sanduhr dieselben Ereignis-Popups einsetzen;
  zusätzliche allgemeine GEDCOM-Felder und weitere Notizinhalte prüfen.
- Wenn Popups zu groß werden, in separate Ereignis-Popups aufteilen und Notizen
  begrenzen; vollständige Informationen in DETAILS belassen.

## Deployment und Workflows

- `.github/workflows/pages.yml` baut und veröffentlicht GitHub Pages aus
  `master`.
- `.github/workflows/node.js.yml` führt Format-, Lint-, Build-, Unit- und
  Browserprüfungen aus. Playwright war wiederholt fehlerhaft; bei jedem Lauf
  tatsächliche Logs prüfen.
- **Erledigt 22.11.2026:** Bei den vier Prober-Workflows (**GitHub Pages**,
  **WikiTree**, **WikiTree CORS**, **Docker**) wurden die täglichen
  `schedule`-Auslöser entfernt. `workflow_dispatch` und `workflow_call` bleiben
  erhalten; sie sind weiter manuell oder über das optionale
  `deploy-everywhere.yml` ausführbar.
- **Erledigt 22.11.2026:** Der Benutzer hat bestätigt, dass die öffentliche,
  bereinigte Halmenschlager-GEDCOM **und ZIP** per URL in Topola funktionieren
  und die Geburtsdaten der zwei lebenden Personen fehlen. Die beiden Dateien
  bleiben unter `public/examples/reinhold-halmenschlager.ged` und `.zip`.
- **Erledigt 22.11.2026:** `Öffne URL` verwendet standardmäßig direkten Abruf
  (`handleCors=false`), Proxy nur nach explizitem Opt-in im Dialog bzw.
  `handleCors=true` bei fremden Servern; dieselbe Domain wird niemals über den
  Drittanbieter-Proxy geladen. `Öffne Datei` verarbeitet GEDCOM/ZIP lokal (kein
  CORS). URL-Ladeverhalten mit Unit-Tests abgesichert; Browserergebnis nach
  Deployment weiter prüfen.
- GEDCOM/ZIP bleiben bei Updates am selben Pfad in `public/examples/`. Vorgehen:
  geprüfte öffentliche Kopie erzeugen, Dateien ersetzen, Commit/Push, Deployment
  prüfen, Abruf von GEDCOM und ZIP per URL testen.

## Vorgesehene Arbeitsfolge

1. **Erledigt 22.11.2026:** Menü-/Einstellungs-/Tab-Änderungen.
2. Startperson und Such-/Fokusnavigation entwerfen und testen.
3. **Erledigt 22.11.2026:** Gemeinsamer Diagrammstil, IDENTIFIKATION und
   Ortsmarkierung.
4. Gemeinsame Popups mit ergänzenden GEDCOM-Daten und gekürzten HTML-Notizen.
5. Neueste GEDCOM gegen veröffentlichte GED/ZIP-Dateien vergleichen, Datenschutz
   überprüfen, ggf. aktualisieren.
6. **Erledigt:** Tägliche Prober-Auslöser deaktiviert; manueller Start bleibt
   möglich.

## Fortsetzung in einem neuen Chat

> Wir arbeiten an `ErichSteinboeck/topola-viewer`. Bitte zuerst `DEVELOPMENT.md`
> und den aktuellen Code lesen. Die Forschungs-TXT ist die Recherchegrundlage;
> GEDCOM ist MyHeritage-Export. Unser Vorfahrenfächer ist bereits implementiert.
> Menü, Seitenleiste und Diagrammstil sind umgesetzt. Offen sind die noch nicht
> entschiedene automatische Hauptperson-Auswahl, diagrammübergreifendes
> Auswahlverhalten und gemeinsame Popups. Die neueste hochgeladene GEDCOM vom
> 21.11.2026 darf nicht ohne Datenschutz-/Versionsprüfung die bereits
> veröffentlichte Kopie ersetzen.

**Pflege:** Nach jedem abgeschlossenen Entwicklungsschritt Status und offene
Entscheidungen hier aktualisieren.
