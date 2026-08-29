# Instruktion 20: Responsives Vollbild, PWA-Installation, Fullscreen-Button

## Kontext
Aufbauend auf Instruktion 19 (Touch-Steuerung, bereits umgesetzt). Dieser
Auftrag löst zwei verwandte Probleme auf Mobilgeräten:

1. Das Spielfeld nutzt aktuell nicht die volle Bildschirmfläche (fixe
   Canvas-Grösse aus Instruktion 1, gedacht für Desktop)
2. Der Browser-Rahmen (Adressleiste etc.) ist im Weg — dafür kombinieren
   wir drei Bausteine: responsives Vollbild-Layout, PWA-Installation, und
   einen Fullscreen-Button dort, wo die Fullscreen API tatsächlich
   funktioniert

**Wichtiger Fakt vorab (aktuell recherchiert, Stand 2026):** Die
Fullscreen API funktioniert auf dem **iPhone in Safari nicht** (und in
keinem anderen iOS-Browser, da alle auf WebKit aufsetzen müssen) — der
Aufruf schlägt dort lautlos fehl. Auf iPad, Android und Desktop
funktioniert sie normal. Für iPhone ist die **PWA-Installation** ("Zum
Home-Bildschirm hinzufügen") der einzige zuverlässige Weg zu einer
Ansicht ohne Browser-Chrome. Bitte diese Instruktion entsprechend so
umsetzen, dass beide Wege kombiniert werden, nicht nur einer.

## Aufgaben

### 1. Responsives Canvas-Layout mit Letterboxing

- Bestehendes Canvas-Setup (`src/engine/canvas.ts`, Instruktion 1)
  anpassen: das Canvas-Element füllt per CSS die komplette verfügbare
  Viewport-Fläche (`100dvw`/`100dvh` verwenden, **nicht** `100vw`/`100vh`
  — `dvh`/`dvw` berücksichtigen, dass mobile Browser ihre Adressleiste
  ein-/ausblenden, `vh` springt dabei unschön)
- Die **interne, logische Spielauflösung** (aktuell z.B. 800×600 aus
  Instruktion 1) bleibt unverändert — die gesamte Spiellogik (Feld-
  Polygon, Bewegung, Kollisionen) rechnet weiterhin in dieser festen
  Koordinatenwelt, **nichts davon wird angepasst**
- Die Umrechnung passiert ausschliesslich in der Rendering-/Anzeige-
  Schicht: Skalierungsfaktor berechnen (`min(verfügbareBreite /
  logischeBreite, verfügbareHöhe / logischeHöhe)`), Canvas per CSS
  `transform: scale(...)` oder durch Setzen von CSS-`width`/`height`
  entsprechend zentriert darstellen
- Passt das Seitenverhältnis nicht exakt: **Letterboxing** (schwarze
  Balken oben/unten oder links/rechts), keine Verzerrung, kein
  Abschneiden des Spielfelds
- Bei `resize`- und `orientationchange`-Events neu berechnen
- Bestehende `devicePixelRatio`-Behandlung aus Instruktion 1 (für scharfe
  Darstellung) bleibt bestehen und muss mit der neuen Skalierung
  zusammenspielen, nicht dagegen arbeiten

### 2. PWA-Setup

- `public/manifest.json`: Name ("Wormfied"), `short_name`, `display:
  "standalone"`, `background_color`/`theme_color` passend zur bisherigen
  dunklen Farbwelt, Icons (siehe unten)
- Icons: einfache Platzhalter-Icons in den gängigen Grössen (mind.
  192×192 und 512×512 PNG) — falls keine dedizierten App-Icons vorhanden
  sind, das bestehende `wormfied-logo.svg` oder `player.svg` als
  Grundlage rastern/zuschneiden, klar als Platzhalter kennzeichnen, finales
  Icon-Design ist nicht Teil dieses Auftrags
- Einfacher Service Worker (`public/sw.js` oder via Vite-PWA-Plugin, z.B.
  `vite-plugin-pwa` — bitte kurz begründen, welcher Ansatz gewählt wurde):
  cached die Kern-Assets (JS/CSS/Bilder/Sounds) für Offline-Fähigkeit und
  schnelleren Wiederaufruf, keine komplexe Cache-Invalidierungsstrategie
  nötig für diesen Schritt
- Service Worker registrieren, `<link rel="manifest">` im HTML ergänzen

### 3. iOS-Hinweis "Zum Home-Bildschirm hinzufügen"

- Erkennung: iOS-Gerät (`navigator.platform`/`userAgent`, oder
  zuverlässiger über Feature-Detection wie `'standalone' in
  navigator`) UND **nicht** bereits als PWA installiert
  (`navigator.standalone === false` auf iOS, bzw. allgemein
  `window.matchMedia('(display-mode: standalone)').matches` für andere
  Plattformen)
- Falls beides zutrifft: ein dezentes, schliessbares Banner/Hinweis
  einblenden ("Für das beste Spielerlebnis: Teilen-Button → Zum
  Home-Bildschirm hinzufügen"), mit dem Teilen-Icon oder Text beschrieben
  — kann nicht automatisiert/programmatisch ausgelöst werden (iOS lässt
  das nicht zu), nur anzeigen
- Schliessen-Zustand in `localStorage` merken, damit der Hinweis nicht bei
  jedem Besuch erneut erscheint (einfacher Flag reicht, kein
  Ablaufdatum nötig)

### 4. Fullscreen-Button (Progressive Enhancement)

- Sichtbarer Button im HUD/Menü, der `element.requestFullscreen()`
  aufruft (mit den bekannten Vendor-Prefixes für ältere Browser, falls
  gewünscht, aber nicht zwingend notwendig)
- **Vor dem Anzeigen des Buttons prüfen:** `document.fullscreenEnabled`
  UND **zusätzlich explizit iOS ausschliessen** (siehe Erkennung oben) —
  manche iOS-Versionen melden über Feature-Flags widersprüchliche
  Unterstützung, daher lieber zusätzlich hart auf iOS filtern, statt sich
  nur auf `fullscreenEnabled` zu verlassen
- Ist keine der Bedingungen erfüllt: Button gar nicht rendern (kein
  deaktivierter/nutzloser Button)
- Beim Verlassen des Fullscreen-Modus (`fullscreenchange`-Event) Button-
  Zustand/Icon entsprechend aktualisieren (z.B. "Vollbild" ↔
  "Vollbild verlassen")

### 5. Zusammenspiel mit Touch-Steuerung (Instruktion 19)

- Die Touch-Controls (Joystick/Action-Button) sind als HTML-Overlay
  positioniert, nicht Teil des Canvas-Koordinatensystems — durch die neue
  Skalierung/Letterboxing ändert sich daran nichts, sie bleiben unabhängig
  vom Canvas-Scale-Faktor an fixen Viewport-Positionen (z.B. via
  `safe-area-inset`, siehe Instruktion 19). Bitte kurz verifizieren, dass
  das nach dieser Instruktion weiterhin so stimmt, insbesondere bei
  Letterboxing mit seitlichen/oberen schwarzen Balken

### 6. Tests

- Reines Layout/Scaling ist schwer sinnvoll automatisiert zu testen —
  bitte nur die reine Berechnungsfunktion testen, falls ausgelagert (z.B.
  `calculateCanvasScale(viewportWidth, viewportHeight, logicalWidth,
  logicalHeight): { scale, offsetX, offsetY }`):
  - Test: quadratischer Viewport mit breiterem Logik-Format ergibt
    korrekte Letterbox-Offsets oben/unten
  - Test: sehr schmaler, hoher Viewport (typisches Phone-Hochformat)
    ergibt korrekte seitliche Letterbox-Offsets

## Was NICHT Teil dieses Auftrags ist
- Finales App-Icon-Design (Platzhalter reicht)
- Komplexe Service-Worker-Cache-Invalidierung/Versionierung
- Android-spezifischer Custom-Install-Prompt (`beforeinstallprompt`
  abfangen für einen schöneren Install-Button) — guter Folgeauftrag, aber
  hier bewusst ausgeklammert, der native Browser-Install-Hinweis reicht
  vorerst
- Änderungen an der internen Spiel-Logik/Koordinatenwelt

## Nach Abschluss
Bitte kurz zusammenfassen:
- Wie die Letterboxing-Berechnung konkret gelöst wurde
- Ob `vite-plugin-pwa` oder ein manueller Service Worker verwendet wurde,
  und warum
- Wie sich das Ergebnis auf einem echten oder emulierten Mobilgerät
  anfühlt (volle Fläche genutzt? Fullscreen-Button erscheint nur, wo
  sinnvoll? iOS-Hinweis korrekt nur auf iOS ohne Standalone-Modus?)
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt
