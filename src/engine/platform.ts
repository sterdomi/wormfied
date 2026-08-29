/**
 * Plattform-/Anzeigemodus-Erkennung (Instruktion 20), gemeinsam genutzt vom
 * iOS-"Zum-Home-Bildschirm"-Hinweis (`ui/iosInstallHint.ts`) und dem
 * Fullscreen-Button (`ui/hud.ts`) – beide brauchen dieselbe iOS-Erkennung,
 * daher hier zentral statt dupliziert.
 */

/**
 * iOS-Erkennung über `navigator.platform` (klassische Geräte) UND zusätzlich
 * über `'standalone' in navigator` (iOS-spezifische Safari-Eigenschaft,
 * WebKit-Feature-Detection – auf iPadOS 13+ meldet `navigator.platform`
 * inzwischen "MacIntel" wie ein echter Mac, daher reicht `platform` allein
 * nicht mehr). Defensiv gegenüber Umgebungen ohne `navigator` (Tests).
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platformIsIos = /iPad|iPhone|iPod/.test(navigator.platform ?? '');
  return platformIsIos || 'standalone' in navigator;
}

/**
 * Enger als `isIOS()`: NUR iPhone (kein iPad). Die "Zum Home-Bildschirm
 * hinzufügen"-Anleitung (Teilen-Symbol → Zum Home-Bildschirm) gilt so nur
 * auf dem iPhone – auf dem Mac heisst der entsprechende Weg "Zum Dock
 * hinzufügen", auf Windows/Android sieht der Ablauf wieder anders aus (dort
 * bewusst kein Hinweis, siehe `iosInstallHint.ts`). iPads sind hier
 * ausgenommen, da bei ihnen laut Instruktion die Fullscreen API ohnehin
 * normal funktioniert – kein Grund, den (iPhone-spezifisch formulierten)
 * Install-Hinweis dort einzublenden. Nutzt bewusst NICHT den
 * `'standalone' in navigator`-Fallback aus `isIOS()`, der auch auf iPadOS
 * 13+ (dort als "MacIntel" maskiert) anschlägt.
 */
export function isIPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPod/.test(navigator.platform ?? '');
}

/**
 * Läuft die Seite bereits als installierte PWA (vom Homescreen gestartet)?
 * `navigator.standalone` ist iOS-spezifisch (Safari), `display-mode:
 * standalone` deckt Android/Desktop ab (siehe `manifest.webmanifest`,
 * `"display": "standalone"`).
 */
export function isStandaloneDisplayMode(): boolean {
  if (typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone) {
    return true;
  }
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}
