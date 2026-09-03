# Level 4 – Gorilla am Bongo: Bildgenerator-Prompts

Level-4-Konzept: ein **Gorilla** sitzt unten in der Feldmitte und **spielt im
Rhythmus ein Bongo** (Paar kleiner Handtrommeln zwischen den Beinen), gibt also
den Takt vor.

**Das Bongo ist Teil jedes Gorilla-Frames** (zwischen den Beinen mitgezeichnet)
– kein separates Bild. Es genügt also die Serie **`gorilla_*.png`**.

Alle im Stil der übrigen Gegner: **kräftige schwarze Outline, flache satte
Cel-Shading-Farben, weiches Licht von oben**, Mobile-Arcade-Boss-Look.

Dateien → `public/assets/levels/level4/`.

---

## 1. Charakter-Design (über ALLE Frames identisch)

Ein **hünenhafter Silberrücken-Trommler** – gerne speziell/einprägsam:

- massiger Oberkörper, riesige Unterarme und Hände, kurze Beine – sitzt im
  Schneidersitz, das Bongo zwischen den Knien;
- dunkles Fell (Anthrazit/Braun-Schwarz) mit **silbernem Rücken/Nacken**;
- **Stammes-Bemalung** auf Brust und Armen in leuchtendem Türkis oder Orange
  (dezent glimmend), ein paar alte Narben;
- **Kopfschmuck**: Knochen-/Federkrone oder ein Tier-Schädel als
  Schulterpanzer; Knochen-/Zahn-Halskette;
- böser, breiter Grinse-/Fletsch-Ausdruck, kleine wütende Augen.
- Klar der Boss – bedrohlich, aber Cartoon.

**Das Bongo** (in jedem Frame gleich, mitgezeichnet): ein Bongo-Paar (zwei
aneinander befestigte Handtrommeln, eine grössere + eine kleinere), zwischen
den Beinen, leicht von schräg oben, sodass beide runden Felle oben sichtbar
sind. Kurze Holzkessel mit Metallringen und Seil/Beschlägen, Dschungel-Stammes-
Schnitzereien, dezente türkis glimmende Runen.

Gleich in jedem Frame: Fellfarben, Bemalung, Bongo (Grösse/Position/Winkel),
Outline-Stärke, Proportionen, Licht von oben.

---

## 2. Technik & Konsistenz

- **Frontansicht**, der Gorilla schaut den Betrachter/Spieler an (er sitzt
  unten am Feldrand und blickt ins Feld hinauf). Symmetrische Grundhaltung.
- Alle Frames **exakt gleiche Leinwand: 1024 × 1280 px** (Hochformat),
  transparenter Hintergrund (PNG + Alpha).
- **Gleiche Grösse & gleiche Sitzposition** in jedem Frame: Hüfte/Sitzpunkt
  immer an derselben Stelle, ca. **80 % der Höhe von oben**, waagerecht
  mittig. Das **Bongo** steht ebenfalls in jedem Frame an derselben Stelle
  (zwischen den Beinen, Felle bei ca. **70 % der Höhe**). Nur Arme, Schultern,
  Mimik ändern sich.
- **Gespielt wird mit offenen Händen** – Handflächen und Finger auf den
  Bongo-Fellen, beim Akzent mit dem Handballen. Keine geballten Fäuste.
- **Kein Boden, kein Schatten, kein Glow** (ausser der dezenten Runen-Glut auf
  Fell/Bongo). Kein Text, kein Rahmen. Nicht spiegeln (die Links/Rechts-Frames
  werden extra geliefert).
- Ringsum ~40 px Luft, nichts hart am Rand abschneiden.

---

## 3. Prompts – je einzeln in den Generator kopieren

### Gemeinsamer Block (steckt in jedem Prompt)

> Single 2D game sprite, portrait canvas 1024×1280, fully transparent
> background (PNG alpha), subject centered horizontally. One hulking cartoon
> silverback gorilla bongo player, front view, facing the viewer, sitting
> cross-legged with a pair of bongo drums between his legs (two small hand
> drums joined side by side, one larger and one smaller, short wooden shells,
> metal rims, rope hardware, carved jungle-tribal patterns, faint glowing
> turquoise runes; seen slightly from above so both round drumheads are
> visible, at ~70% of the canvas height). Bold thick black outline, flat
> saturated cel shading, soft top-down light, mobile-arcade boss style.
> Massive torso, huge forearms and hands, short legs. Dark charcoal-brown fur
> with a silver back and neck. Glowing turquoise tribal paint on chest and
> arms, a few old scars. A bone-and-feather crown or an animal-skull shoulder
> pauldron, a bone necklace. Small angry eyes, wide snarling grin. Clearly a
> boss — menacing but cartoon. He plays with OPEN HANDS (palms and fingers),
> never clenched fists. Same character, colors, proportions, bongo and
> lighting in every frame; the seated point is always at ~80% of the canvas
> height, horizontally centered, the bongo always in the same spot. No ground,
> no cast shadow, no extra glow, no background, no text, no border. Do not
> mirror.

### `gorilla_bereit.png` – Grundhaltung / Ruhe

> [gemeinsamer Block]
> POSE: at rest between beats. Sitting upright, both open hands resting lightly
> on the two bongo heads, forearms relaxed but ready. Head up, looking
> straight at the viewer, calm menacing grin.

### `gorilla_haende_hoch.png` – beide Hände hoch (Ausholen / Akzent)

> [gemeinsamer Block]
> POSE: both arms raised high overhead, hands open, near the top of the canvas
> (~12% from the top), shoulders up, chest lifted, mouth open in a shout —
> winding up for a big double slap. Bongo and seated point unchanged.

### `gorilla_schlag_beide.png` – beide Hände schlagen

> [gemeinsamer Block]
> POSE: both open palms slamming DOWN together onto both bongo heads, arms
> nearly straight, shoulders driven down, body compressed with the impact,
> fierce open-mouth "OOMPH" expression. Bongo and seated point unchanged.

### `gorilla_schlag_links.png` – linke Hand schlägt

> [gemeinsamer Block]
> POSE: an alternating single hit. The gorilla's LEFT open hand slaps down on
> the left (larger) bongo head; the RIGHT arm is raised, right hand open near
> the top. Torso leans slightly toward the striking side. Focused snarl. Bongo
> and seated point unchanged.

### `gorilla_schlag_rechts.png` – rechte Hand schlägt (Spiegel von links)

> [gemeinsamer Block]
> POSE: the mirror of the left-hand hit. The gorilla's RIGHT open hand slaps
> down on the right (smaller) bongo head; the LEFT arm is raised, left hand
> open near the top. Torso leans slightly toward the striking side. Focused
> snarl. Bongo and seated point unchanged. Must read as a clean mirror of
> `gorilla_schlag_links` (keep the larger drum on the same physical side).

### `gorilla_bruellen.png` – Brüllen (optional, für einen Akzent-Beat)

> [gemeinsamer Block]
> POSE: a roar. Chest thrown out, both arms flung wide and back, head tilted
> up, mouth wide open roaring, teeth bared. Hands off the bongo this frame.
> Bongo and seated point unchanged.

---

## 4. Zusammensetzen (Pixelmator / Code)

- Die **Frames alle exakt 1024×1280** lassen – nicht einzeln zuschneiden/
  trimmen (verschiebt Sitzpunkt & Bongo). Muss getrimmt werden, dann alle mit
  **demselben** Rechteck.
- Im Spiel wird der Gorilla-Frame unten mittig platziert; die Serie wird
  einfach durchgetauscht:
  `gorilla_bereit` = Idle, `haende_hoch` → `schlag_beide` = Akzent-Schlag,
  `schlag_links`/`schlag_rechts` = wechselnde Einzelschläge fürs Rhythmus-
  Muster, `gorilla_bruellen` = optionaler Angriffs-/Telegraph-Beat.
