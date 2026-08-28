# Instruktion 16: Glow-Effekte

## Kontext
Aufbauend auf Instruktion 15 (Andock/Abdock-Steuerung, bereits umgesetzt).
Dieser Auftrag fügt fünf visuelle Glow-Effekte hinzu, die dem Spiel mehr
Atmosphäre geben, ohne neue Spielmechanik einzuführen:

1. Schild-Aura um den Spieler
2. Pulsierende Bonussteine
3. Glühender Zeichen-Pfad
4. Dynamisch pulsierende Gegner-Augen
5. Screen-Flash bei Lebensverlust

**Noch NICHT Teil dieses Auftrags:** Sound (folgt in einer separaten
Instruktion).

## Wichtiger Hinweis zur Performance

`ctx.shadowBlur`/`ctx.shadowColor` sind die einfachsten Mittel für
Glow-Effekte in Canvas 2D, aber vergleichsweise teuer, wenn sie auf vielen
Objekten gleichzeitig oder auf grossen Flächen jeden Frame neu berechnet
werden. Bitte wo sinnvoll auf performantere Alternativen ausweichen (z.B.
mehrere halbtransparente, leicht grössere Kopien einer Form untereinander
zeichnen statt `shadowBlur`, oder radiale Gradienten statt echtem Blur) und
kurz kommentieren, wo `shadowBlur` trotzdem verwendet wird und warum es dort
unproblematisch ist (z.B. weil nur auf kleine Objekte angewendet). Falls
beim Testen spürbare Framerate-Einbrüche auftreten, bitte im
Abschluss-Bericht erwähnen.

## Aufgaben

### 1. Schild-Aura um den Spieler

- Solange `shield > 0` (Instruktion 8): sanfter Glow-Rand um den
  Spieler-Sprite, dessen Intensität proportional zu `shield / 100` skaliert
  (voller Schild = deutlich sichtbare Aura, kurz vor 0 = kaum noch
  sichtbar)
- Technisch z.B.: ein radialer Gradient (hellblau/weisslich, passend zur
  bisherigen Farbwelt) hinter dem Spieler-Sprite gezeichnet, Radius/Opacity
  an `shield`-Wert gekoppelt
- Bei `shield <= 0`: keine Aura mehr (visuell konsistent mit der
  Ungeschützt-Regel aus Instruktion 8)

### 2. Pulsierende Bonussteine

- Bestehendes Fade-Out am Lebensende (Instruktion 14, Punkt 4) bleibt
  erhalten, zusätzlich: kontinuierliches Pulsieren der Glow-Intensität
  während der gesamten Lebensdauer (z.B. über eine Sinus-Funktion basierend
  auf verstrichener Zeit)
- Puls-Frequenz nimmt zu, je näher der Stein an seinem `lifetimeSeconds`-
  Ablauf ist (z.B. in den letzten 3 Sekunden spürbar schnelleres Pulsieren
  als zu Beginn) — das dient als zusätzliches, nonverbales Warnsignal
- Farbe des Glows entsprechend Bonustyp (Blau für Speed, Orange für Kanone,
  konsistent mit den bestehenden Assets aus Instruktion 14)

### 3. Glühender Zeichen-Pfad

- Während `mode === 'drawing'` (Instruktion 3): die aktuell gezeichnete
  Linie bekommt einen leichten Leucht-Rand (z.B. eine zweite, breitere,
  halbtransparente Linie in ähnlicher Farbe direkt unter der eigentlichen
  Linie gezeichnet, oder `shadowBlur` mit moderatem Radius — bitte
  performanteren Ansatz wählen, siehe Hinweis oben, da diese Linie bei
  längeren Zeichenversuchen aus vielen Punkten bestehen kann)
- Farbe/Intensität so gewählt, dass die Linie klar als "hier bin ich
  verwundbar" lesbar bleibt (bestehende Symbolik aus Instruktion 3 nicht
  konterkarieren)

### 4. Dynamisch pulsierende Gegner-Augen

- Haupt- und Mini-Gegner (Instruktion 7/10): die bereits in den SVGs
  vorhandenen roten Glow-Augen bekommen zusätzlich ein dezentes,
  zeitbasiertes Pulsieren (z.B. leicht wachsender/schrumpfender Glow-Radius
  via `shadowBlur` mit kleinem, günstigem Radius, da nur auf die kleinen
  Augen-Kreise angewendet, nicht auf den ganzen Gegner — hier ist
  `shadowBlur` unproblematisch, siehe Performance-Hinweis)
- Rein dekorativ, keine Kopplung an Spielzustand nötig (einfacher,
  gleichmässiger Puls reicht)

### 5. Screen-Flash bei Lebensverlust

- Bei Auslösung von `handleLifeLoss` (Instruktion 8): kurzer, rötlicher
  Vignetten-Flash über den gesamten Canvas (z.B. ein radialer Gradient von
  transparent in der Mitte zu halbtransparentem Rot am Rand, der über ca.
  200–300ms ausblendet)
- Technisch ähnlich wie die bestehenden `Explosion`-Objekte (Instruktion
  12) strukturiert — bitte prüfen, ob sich das bestehende Timing-/
  Fade-Muster wiederverwenden lässt (z.B. eigener, einfacher
  `screenFlash`-Zustand mit `startTime`/`durationMs`, analog zu
  `Explosion`), statt ein komplett neues Muster einzuführen

### 6. Zentrale Konstanten

- Alle neu eingeführten Werte (Puls-Geschwindigkeiten, Glow-Radien,
  Flash-Dauer usw.) als benannte Konstanten an sinnvoller, zentraler Stelle
  definieren (z.B. `src/game/visualEffectsConfig.ts`), nicht verstreut in
  den jeweiligen Rendering-Funktionen

### 7. Tests

- Reines Rendering ist schwer sinnvoll automatisiert zu testen — bitte nur
  dort Tests ergänzen, wo reine Berechnungslogik ausgelagert wird (z.B.
  eine Funktion, die aus `shield`-Wert die Aura-Opacity berechnet, oder aus
  verstrichener Zeit die Puls-Intensität eines Bonussteins berechnet):
  - `src/game/visualEffects.test.ts`: Tests für diese reinen
    Berechnungsfunktionen (z.B. Aura-Opacity bei `shield=100` vs.
    `shield=10` vs. `shield=0`, Puls-Frequenz-Beschleunigung in den letzten
    3 Sekunden eines Bonussteins)

## Was NICHT Teil dieses Auftrags ist
- Sound/Musik (separate Instruktion folgt)
- Glow für HUD-Elemente (z.B. bei Extra-Leben oder Levelabschluss-Bonus,
  siehe Instruktion 9/12) — könnte ein guter kleiner Folgeauftrag sein,
  ist aber hier bewusst nicht enthalten
- Partikel-Systeme über die bestehende `Explosion`-Logik hinaus

## Nach Abschluss
Bitte kurz zusammenfassen:
- Welche Stellen `shadowBlur` nutzen und welche auf performantere
  Alternativen ausweichen, und ob beim Testen Framerate-Probleme
  aufgetreten sind
- Wie der Screen-Flash strukturell umgesetzt wurde (eigenes System oder
  Wiederverwendung der `Explosion`-Logik)
- Ob und warum von obigen Vorgaben abgewichen wurde
- Vorschlag für den nächsten sinnvollen Schritt (vermutlich: Sound-
  Grundgerüst, wie besprochen)
