# Topola Viewer – Entwicklungsstand

**Stand: 23. November 2026**  
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
  normaler Klick die Details öffnet (Shift-Klick fokussiert). Alte URL- und localStorage-Werte (`technical`, `i`,
  `click`) behalten unverändert ihre Bedeutung. Kein Datenmigrationsschritt
  notwendig.

### Noch zu entscheiden: Sonderfelder und zusätzliche GEDCOM-Notizen

- **Offen:** Wie sollen Sonderfelder wie `BIO` (Biografie), `BERUF` (Beruf) und Einträge wie `NOTE godparents:` (Taufpaten) aus der Forschungs-TXT bzw. dem MyHeritage-GEDCOM übernommen und angezeigt werden?
- Prüfen, welche Informationen als standardisierte GEDCOM-Ereignisse/Attribute vorliegen, welche in freien Notizen stehen und welche beim Export möglicherweise verloren gehen.
- Gemeinsam festlegen, ob und wo diese Inhalte in **DETAILS**, in den **Ereignis-Popups** und gegebenenfalls in Diagrammfeldern erscheinen sollen; doppelte Anzeigen vermeiden.
- **Noch keine Entscheidung oder automatische Umwandlung vornehmen.** Forschungs-TXT bleibt die maßgebliche Grundlage.

### Mobile/Touch-Bedienung (offene Entscheidung, 22.11.2026)

- **Beobachtung am Smartphone:** Die großen Fächer-Ereignis-Popups können den Bildschirm und die Details-Seitenleiste verdecken (Screenshot aus dem Gespräch). Scrollbare lange Notizen sind so schwer bedienbar.
- **Original-Topola (Codeprüfung in `PeWu/topola-viewer/src/chart/chart_wrapper.ts`):** `indiCallback` prüft `info.modifiers?.shiftKey`. Ohne Shift wird die Hauptperson neu gewählt, mit Shift werden nur die Details geöffnet. In diesem Codepfad gibt es keine spezielle mobile Alternative für Shift-Klick. Die Seitenleiste wird auf schmalen Bildschirmen (`max-width: 767px`) standardmäßig eingeklappt; das ist keine eigene Shift-Ersatzgeste.
- **Unser Fork:** Klickbelegung kann mit `click=details|focus` umgekehrt werden. Die Fächer-Popups verwenden Maus-Hover (`onMouseEnter`); auf Touch-Geräten ist das nicht zuverlässig oder hilfreich.
- **Zur Diskussion, noch nicht implementiert:** Auf Geräten mit Touch-/Hover-unfähiger Eingabe keine automatischen Hover-Popups; einfaches Antippen öffnet DETAILS. Neuausrichtung des Baums über eine gut erkennbare Schaltfläche/Aktion **„Als Hauptperson festlegen“**, auch mobil erreichbar. Geburt/Tod/Heirat samt Quellnotizen weiterhin in DETAILS zugänglich machen. Desktop-Hover-Popups und die dortige Klick-Konfiguration bleiben erhalten.
- **Technische Prüfung offen:** Fähigkeitserkennung nach `(hover: none)` / `(pointer: coarse)` statt allein nach Bildschirmbreite; Test auf Android, iOS, Touch-Laptop sowie mit externer Maus/Tastatur.
- **Weitere Popup-Korrekturen (Desktop):** Position an tatsächlichen Popup-Abmessungen statt fester Höhe berechnen (besonders bei Personen ohne Daten); beim Weg zum Popup andere Hover-Popups nicht sofort darüberlegen; Verlassen mit sinnvoller Verzögerung. Zusätzlich gerade/gebogene Leserichtung am unteren Fächer kontrollieren und Heiratssymbol mit Sanduhr-Darstellung vereinheitlichen.

### Fächer-Beschriftung und Touch-Verhalten (Änderung 23.11.2026)

- **Implementiert, Browsertest noch offen:** Gebogene Textzeilen in den inneren **fünf** statt vier Vorfahrengenerationen. Datum und Ort erhalten kleinere Schrift als Namen (analog zum Sanduhr-Diagramm).
- **Äußere Generationen 6–12:** Gerader Text, kleinere Schrift (Name ca. 8 px); standardmäßig **eine Namenszeile + eine zusammengefasste Zeile** für Geburtsjahr/-ort und Sterbejahr/-ort. Lange Inhalte werden für die knappen Sektoren gekürzt; vollständige Daten verbleiben in DETAILS und am Desktop in Ereignis-Popups. Bei eingeblendeter IDENTIFIKATION kommt eine zusätzliche kleine ID-Zeile hinzu.
- **Touch-Geräte:** Mit `(hover: none), (pointer: coarse)` erkannt; kein automatisches Fächer-Ereignis-Popup. In Sanduhr/Verwandten-Diagrammen werden hinzugefügte SVG-`title`-Tooltips bei Touch unterdrückt. Tippen auf eine Person zeigt DETAILS unabhängig von `click`-Einstellung (Desktop-Verhalten bleibt unverändert).
- **Noch offen:** Browserprüfung auf Handy/Tablet/Hybrid-Laptop und SVG-Export; alternative gut sichtbare Aktion **„Als Hauptperson festlegen“** für Touch, damit ohne Shift-Taste auch die Neuausrichtung möglich ist. Gegebenenfalls Donatso-/weitere Bibliotheks-Tooltips separat prüfen.
- **Nachbesserung 23.11.2026; Browserkontrolle noch offen:** Bogenpfade verwenden explizit die zur Leserichtung passende Tangente (links nach rechts, auch unterhalb der x-Achse). Desktop-Popups werden anhand ihrer tatsächlich gemessenen Größe am verfügbaren Bildschirmplatz ausgerichtet. Verlassen des Auslösers schließt nach 750 ms; ein anderes Popup ersetzt ein vorhandenes erst nach 450 ms, beim Betreten des Popups werden beide Timer abgebrochen, damit Scrollen/Links erreichbar bleiben. Das Heiratszeichen im Fächer ist nun `∞` innerhalb des bisherigen Kreises (statt orangefarbener Raute).
- **Noch offen:** Gemeinsame Popups auch im Sanduhr-Chart; Browserprüfung von Leserichtung, Popup-Wechseln und `∞`-Symbol bei verschiedenem Zoom und Bildschirmgrößen.

### Nachbesserungen aus Browser-Screenshots (23.11.2026)

- **Gebogene Beschriftungen unterhalb der x-Achse:** Die bisherige Bogenumkehr wurde zurückgenommen: Der SVG-`textPath` verwendet die vorwärts gerichtete Bogenlinie auch in den unteren Sektoren, damit die dort beobachtete um 180° verkehrte Schrift korrigiert wird. **Browserkontrolle ausständig.**
- **Äußere zweizeilige Beschriftungen:** Geburt und Tod bleiben optisch in **derselben zweiten Zeile**, sind aber getrennte `tspan`-Hover-Bereiche. Geburt öffnet Geburt/Taufe, Tod öffnet Tod/Beerdigung. **Browserkontrolle ausständig.**
- **Notizen in Ereignis-Popups:** Die bisherige harte Kürzung bei **1.500 Zeichen** (`note.slice(0, 1500)`) wurde entfernt. Scrollleisten und HTML/Matricula-Links bleiben erhalten; vollständige Notizen wie in DETAILS. Bei sehr langen Einträgen muss die Performance im Browser geprüft werden.
- Bereits im Browser bestätigt: Heiratszeichen `∞`, fünf gebogene Generationen und zweizeilige Beschriftungen der äußeren Generationen.

### Feinabstimmung nach Browserprüfung (23.11.2026)

- **Vom Benutzer bestätigt:** Gebogene Texte sind auch unterhalb der x-Achse richtig herum; Popup-Notizen werden vollständig angezeigt; gerade äußere Ereigniszeilen besitzen getrennte Geburt-/Tod-Popups.
- **Aktuelle Änderung, noch zu prüfen:** Gebogene Textstapel um 6 SVG-Einheiten radial nach innen verschoben. Hintergrund: Die SVG-Schrift steht oberhalb der Bogen-Baseline; eine rein mathematische Zentrierung der Baselines wirkt dadurch nach außen versetzt.
- **Aktuelle Änderung, noch zu prüfen:** Das Fächer-Heiratssymbol wurde von `∞` (Unendlich) auf `⚭` (Unicode U+26AD, Heiratszeichen mit zwei verschlungenen Ringen wie in der Sanduhr) geändert. Der Kreisrahmen bleibt.

### Feinkorrekturen 23.11.2026: Heirat, mobile Generationen und Volltext

- **Heiratssymbol im Fächer:** `⚭` schwarz und leichter gesetzt, optisch auf die Mitte des Kreises ausgerichtet; Kreisradius von 8 auf 12 SVG-Einheiten (+50 %) vergrößert. Kreislinie wie Sektor-Trennlinie `#a7a7a7` / 0,85, Hintergrund weiß. Browserkontrolle auf Desktop/Mobile offen.
- **Generationen auf Touch-Geräten:** Explizite `−`- und `+`-Schaltflächen (mit größeren Touch-Flächen) statt fehlender Browser-Zahlenspinner. Das Zahleneingabefeld akzeptiert einen temporär leeren Wert, so dass Backspace und Neueingabe funktionieren; bei Verlust des Fokus wird auf 1–12 geprüft bzw. die letzte gültige Zahl wiederhergestellt.
- **Volltextsuche:** Technische GEDCOM-Kennungen wie `UID`, `_UID`, `RIN`, `CHAN` und `UPD` nicht mehr in Suchindex/-vorschau aufnehmen. Diese Hex-/ID-Felder verdrängten bisher echte Fundstellen, etwa bei `Jäger`. Funktion im Browser erneut prüfen; diese Felder bleiben unabhängig davon in der GEDCOM-Quelle erhalten.
- **Unverändert:** Mobile/Touch-Geräte verwenden weiterhin DETAILS statt Hover-Popups. GEDCOM-/ZIP-Dateien wurden nicht verändert.

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

- **Browserbestätigung 22.11.2026:** Scrollleisten und Links in den Popups sind bedienbar. Bei gebogenen Texten unterhalb der x-Achse wurde die Richtungswahl an den Grenzwinkeln ±90° nachgebessert; Browserkontrolle noch offen.
- **Nachbesserung 22.11.2026:** Die Klick-Checkbox ist jetzt angehakt bei normalem Klick = DETAILS und Shift-Klick = Neuausrichtung; URL-Werte `click=details` / `click=focus` unverändert.
- **Nachbesserung 22.11.2026:** Fächer-Popups folgen nicht mehr jeder Mausbewegung, werden über ein React-Portal direkt im Dokument angezeigt und haben einen vollständig weißen Hintergrund (auch über der Seitenleiste). Gerade Fächerbeschriftungen erhalten normalisierte, aufrechte Drehwinkel. Browser- und Scrolltest noch ausständig.
- **Offen:** Auch in der Sanduhr dieselben Ereignis-Popups einsetzen;
  zusätzliche allgemeine GEDCOM-Felder und weitere Notizinhalte prüfen.
- Wenn Popups zu groß werden, in separate Ereignis-Popups aufteilen und Notizen
  begrenzen; vollständige Informationen in DETAILS belassen.

## URL-Parameter (geprüft im Quellcode am 22.11.2026)

Die Parameter stehen in der **Hash-Router-Adresse** hinter `#/view?`, zum Beispiel
`https://erichsteinboeck.github.io/topola-viewer/#/view?view=fan&indi=I500003&click=details&notes=always&p=f`.
Wichtig: Parameter **vor** `#/view` sind nicht die normalen Diagrammparameter.
Das Einstellungsmenü schreibt die Einstellungen bei Änderungen ebenfalls in die URL;
einige Einstellungen bleiben zusätzlich im lokalen Browser-Speicher erhalten.
Explizite URL-Parameter gehen den gespeicherten Einstellungen vor.

| Parameter | Mögliche Werte | Wirkung |
| --- | --- | --- |
| `url` | kodierte HTTPS-URL einer GEDCOM-/ZIP-Datei | Quelle per Webadresse öffnen |
| `handleCors` | `true`, `false` (Standard) | Drittanbieter-CORS-Proxy nur bei `true` |
| `file` | interner Datei-Hash | Bereits lokal geladene Datei wiederfinden (browserabhängig) |
| `source` | `wikitree`, `google-drive` | Alternative Quelle; Google Drive benötigt `fileId`, WikiTree ggf. `authcode` |
| `embedded` | `true` | Eingebettete Datenquelle; ändert auch Standalone-Verhalten |
| `view` | `fan`, `relatives`, `fancy`, `donatso`; weglassen = Sanduhr | Diagrammtyp, auch für ausgeblendete Menütypen |
| `indi` | GEDCOM-Personen-ID, z. B. `I500003` | Hauptperson |
| `gen` | Zahl, z. B. `0` | Generation zur gewählten Hauptperson |
| `detail` | Personen-ID | Person in der Details-Seitenleiste |
| `sidePanel` | `true`, `false` | Seitenleiste ein-/ausblenden; Standard hängt von Bildschirmbreite ab |
| `c` | `n` = keine Farben, `g` = Generation, `s` = Geschlecht | Diagrammfarben |
| `i` | `h` = IDENTIFIKATION verbergen, `s` = anzeigen | Personen-ID/Identifikation |
| `s` | `h` = Geschlecht verbergen, `s` = anzeigen | Geschlechtsangabe |
| `p` | `f` = voller Ort, `s` = kurzer Ort, `h` = verbergen | Ortsanzeige (vor allem Sanduhr; Fächer hat eigene Textkürzung) |
| `pn` | Ganzzahl ab `1` (Eingabefeld 1–10) | Zahl der Ortsbestandteile bei `p=s` |
| `click` | `details`, `focus` | `details`: Klick zeigt DETAILS, Shift-Klick fokussiert; `focus`: umgekehrt |
| `technical` | `false` (verbergen), `true` (zeigen) | Technische Felder RIN, UID, UPD |
| `notes` | `always`, `collapsed` | Ereignisnotizen immer oder nur eingeklappt anzeigen |
| `placehover` | `on`, `off` | Identische Orte beim Darüberfahren hervorheben |
| `standalone` | `false` zum Abschalten; sonst aktiv | Standalone-Oberfläche |
| `freeze` | `true` | Diagrammanimation einfrieren |
| `showWikiTreeMenus` | `false` | WikiTree-Menüs ausblenden |

**Klick-Checkbox (Stand 22.11.2026):** Wenn angehakt, bedeutet sie
`click=details`: einfacher Klick zeigt Personendetails,
Shift-Klick richtet den Baum neu aus. Ohne Häkchen (`click=focus`) umgekehrt.
Achtung: Im Browser gespeicherte Alt-Einstellungen können den Standard ohne
expliziten Parameter überschreiben.

**Beispiel (alle vier angefragten Themen):**
`#/view?view=fan&click=details&technical=false&i=h&notes=always&p=f&placehover=on`.
Damit: normaler Klick = Details; technische Felder und Identifikation verborgen;
Ereignisnotizen aufgeklappt; Orte vollständig und Orts-Hover-Markierung aktiv.
Die `p`-Einstellung steuert die regulären Diagramm-Ortsfelder; die
Fächerbeschriftungen werden aus Platzgründen unabhängig davon gekürzt.

**Hinweis:** Die maximale Zahl der im Fächer angezeigten Generationen wird
derzeit über das Bedienfeld im Fächer geregelt (bis 12); hierfür ist in
`getArguments` kein eigener URL-Parameter vorgesehen.

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
