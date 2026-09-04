# Level 1 Film-Noir-Redesign: Bildgenerator-Prompts

Gehört zu [`22-level1-film-noir.md`](./22-level1-film-noir.md). Zwei Prompts,
je einzeln in den Generator kopieren: `background.png` und `foreground.png`.

**Kein Prompt für die Spinne oder das Projektil** – beide werden direkt per
Farb-Edit bestehender SVGs umgesetzt (Punkt 1 bzw. 2 der Instruktion: Spinne
= `gegner*.svg` neu eingefärbt, Projektil = neue `kugel-weiss.svg` als
weisse Kopie von `kugel.svg`, gleiche Form). Kein Bildgenerator nötig für
diese beiden.

Stil wie die übrige Spiel-Grafik (`level4/foreground.png` als Referenz):
**kräftige schwarze Outline, flache Cel-Shading-Farben, weiches Licht von
oben**, mobile-arcade-Look – hier aber bewusst **entsättigt** (Film Noir:
Grau/Blauschwarz-Palette, fast ohne Buntfarbe) statt satt bunt wie in Level
4. Dateien landen unter `public/assets/levels/level1/`.

Auflösung für beide: **1920×1080** (16:9, entspricht dem 960×540-Spielfeld).

---

## `background.png` – Regen-Gasse

Liegt die meiste Zeit UNTER dem Foreground und blitzt nur durch bereits
freigelegte Stellen durch (siehe Instruktion) – darf deshalb ruhig mehr
Bildtiefe/Szenerie zeigen als der Foreground, muss aber auch als
grossflächiger, leicht unscharfer Letterbox-Hintergrund funktionieren (wird
im Spiel zusätzlich weichgezeichnet für die Ränder neben dem Spielfeld).
Vollflächig deckend, randlos, 16:9 Querformat.

> A moody film-noir back-alley scene, full-bleed 16:9 landscape illustration,
> no border, no vignette, no text. Narrow city alley between tall brick
> buildings, seen head-on, vanishing toward the center. Wet cobblestone
> ground reflecting light, a single flickering street lamp casting a warm
> pool of light near the middle, fire escapes and clothing lines silhouetted
> against a hazy night sky, thin fog drifting low. Clean vector-cartoon
> style, bold black outlines, flat cel-shaded forms, soft light from above —
> but almost entirely DESATURATED: charcoal, slate grey, and blue-black
> tones, with only the lamp glow allowed a faint warm amber tint as the sole
> spot of color. No rain drawn (added separately as an animated overlay), no
> characters, no spider, no readable text or signage, fully opaque, fills
> the entire canvas edge to edge.

---

## `foreground.png` – Spinnennetz im Regen-Look

Wird beim Spielen **stückweise ausgeschnitten** (freigelegte Fläche zeigt den
Hintergrund darunter) – muss deshalb auch in Fragmenten gut aussehen:
**gleichmässige Dichte über die ganze Fläche**, kein einzelner Blickfang, kein
Rahmen, keine Vignette. Vollflächig deckend (keine Transparenz), 16:9
Querformat, randlos.

> A seamless full-frame giant spiderweb texture, 16:9 landscape, edge to
> edge, evenly covering the whole canvas — no single focal point, no vignette,
> no border, no frame, no characters, no text. Radiating web strands with
> concentric connecting threads, a few strands beaded with rain droplets, thin
> mist between the threads. Clean vector-cartoon style, bold black outlines,
> flat cel-shaded tones — heavily desaturated film-noir palette: pale grey
> and hazy blue-white threads on a deep charcoal-blue foggy background, soft
> top-down light, no warm colors at all. Even, uniform density across the
> entire image so any random cropped fragment still reads correctly as web.
> Fully opaque, fills the entire canvas.

---

## Danach

- Beide Bilder unter den bestehenden Pfaden ablegen (`background.png` /
  `foreground.png` in `public/assets/levels/level1/`), Dateiname bleibt
  gleich.
- `sw.js`-`CACHE_NAME` hochzählen (Cache-Busting, siehe Hauptinstruktion
  Punkt 6).
- Im Spiel gegentesten: liest sich das Netz im Foreground auch an,
  nachdem schon die Hälfte weggeschnitten ist? Wirkt der Hintergrund
  hinter frisch freigelegten Stellen stimmig dazu?
