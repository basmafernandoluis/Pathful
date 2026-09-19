## Projet

Un puzzle de grille sans chronomètre : chaque case de départ ("tête") porte un chiffre, on
trace à partir d'elle un chemin de cette longueur exacte, et l'objectif est que l'ensemble
des chemins + des obstacles couvre 100% du plateau. Inspiré de l'analyse mécanique de
*BlockWorks - Number Draw Game* (Google Play, `com.fifth.blockworks`) — **jeu et branding
propres, aucun nom/texte/asset de l'original à reprendre.**

## Identité (source unique pour fiche Store et `app.json`)

- Nom : **Pathful** · package Android `com.appwizards.pathful` · `ios.bundleIdentifier`
  identique · `scheme`/`slug` : `pathful`.
- Ne jamais réintroduire "BlockWorks" (nom, icône, captures, texte Store) ni
  l'ancien package `com.joudedani.blockworksclone`.

## Documents de référence dans ce repo

| Fichier | Contenu | À consulter quand |
|---|---|---|
| `regles-du-jeu-blockworks-clone.md` | Spécification complète des règles, y compris les ambiguïtés tranchées | Toute tâche qui touche une règle de jeu — c'est la version qui fait foi, le résumé ci-dessous n'est qu'un aide-mémoire |
| `guide-technique-redeveloppement-expo.md` | Stack, architecture détaillée, algorithme de génération, juice, monétisation, publication | Choix techniques, intégration AdMob/Firebase, build, publication |
| `plan-action-complet.md` | Plan de développement phase par phase avec checkpoints | Savoir quelle est la prochaine étape et comment vérifier qu'elle est terminée |
| `prompts-opencode-par-phase.md` | Prompts type déjà rédigés pour chaque phase | Reformuler une tâche de façon cohérente avec les sessions précédentes |

## Règle non négociable : `src/logic/` ne se modifie jamais

Ce dossier contient la logique de jeu pure (aucune dépendance React/Expo), déjà écrite et
vérifiée avant le début du projet :

- `types.ts` — `Level`, `SnakeHead`, `CellPos` : la seule définition d'un niveau.
- `generator.ts` — génère un niveau garanti solvable (chemin hamiltonien randomisé).
- `gameplay-rules.ts` — `canExtend`, `extend`, `reelBackTo`, `isLevelSolved`,
  `isSnakeComplete`, `remainingTiles`, `createInitialPaths`.
- `hint.ts` — `getHintForHead` (réutilise `solutionPath`, pas de solveur séparé).
- `self-check.ts` / `self-check-edge-cases.ts` — la preuve que tout ça marche ensemble.

**Si une tâche semble nécessiter de modifier un de ces fichiers, c'est un signal d'arrêt** :
n'édite rien, explique pourquoi la tâche semble en avoir besoin, et attends confirmation.
Après toute session ayant touché à l'UI, revérifier que la logique n'a pas bougé :

```bash
npx tsc -p tsconfig.json && node dist/logic/self-check.js && node dist/logic/self-check-edge-cases.js
```

Les deux doivent afficher **0 échec** (90/90 et 10/10 au dernier correctif du 5 septembre
2026). Si l'un des deux casse, le bug est presque certainement dans le code appelant
(conversion geste→cellule, mauvais ordre d'appel), pas dans `src/logic/` lui-même — chercher
de ce côté-là en premier.

`assets/levels.json` (150 niveaux, `level-001` à `level-150`, déjà vérifiés un par un) est
livré tel quel avec le projet. Le régénérer uniquement via `scripts/generate-levels.js`
(fourni), jamais en réimplémentant la logique de progression à la main.

## Règles du jeu — résumé faisant autorité pour le code

- Grille rectangulaire. Chaque case : **tête** (porte un chiffre), **crate** (obstacle
  fixe), ou **case libre** (doit finir couverte).
- Un chemin avance une case à la fois, uniquement en **orthogonal** (jamais en diagonale).
- Le chiffre d'une tête = nombre de **pas**, pas le nombre de cases. Un chemin complet
  occupe `chiffre + 1` cases (tête incluse).
- Un chemin ne peut jamais : sortir de la grille, traverser une crate, se recroiser
  lui-même, ou occuper une case déjà prise par un **autre** chemin.
- Deux chemins de têtes différentes peuvent être **adjacents** sans problème — seule
  l'occupation de la même case est interdite. C'est le cœur du puzzle.
- **Reel back** : toucher n'importe quel point déjà tracé du corps d'un chemin le
  raccourcit instantanément jusqu'à ce point.
- **Victoire** : chaque tête a un chemin complet ET l'union de tous les chemins + les
  crates couvre exactement 100% de la grille.
- Pas de chronomètre, pas de vies, pas de limite de coups en mode Classique. Un plateau ne
  se "perd" jamais.
- Longueur minimale d'une tête : chiffre ≥ 1 (au moins 2 cases par snake).
- Solution garantie par construction, **pas garantie unique** — ne pas coder de logique qui
  suppose l'unicité (voir `guide-technique...md` section 4 pour la nuance sur le système
  d'indices).

Détails complets, table des options pour le mode Arena (non tranché), et justification de
chaque décision ci-dessus : `regles-du-jeu-blockworks-clone.md`.

## Stack

Expo SDK 57 (React Native ~0.86, New Architecture) · TypeScript strict · `@shopify/react-native-skia`
(rendu) · `react-native-gesture-handler` + `react-native-reanimated` (geste et animations) ·
`zustand` (état) · `expo-sqlite` kv-store ou `react-native-mmkv` (sauvegarde locale) ·
`expo-haptics` · `expo-audio` (**pas** `expo-av`, déprécié depuis le SDK 55) ·
`react-native-google-mobile-ads` · `@react-native-firebase/analytics` + `/crashlytics`.

## Architecture des dossiers

```
src/
  logic/      <- ne jamais modifier (voir plus haut)
  ui/         <- composants d'écran, dont GridCanvas (Skia + geste)
  state/      <- zustand, orchestre logic/ + persistance
  services/   <- ads.ts, analytics.ts, storage.ts
app/          <- écrans, expo-router
assets/       <- levels.json
scripts/      <- generate-levels.js, calibrate-crates.js
```

## Commandes utiles

```bash
npx tsc --noEmit                          # vérification de types
npx tsc -p tsconfig.json && node dist/logic/self-check.js && node dist/logic/self-check-edge-cases.js
npx expo start                            # dev server (Skia installée → dev build EAS requis, Expo Go ne suffit plus)
npx expo-doctor                           # avant tout build natif
eas build --platform android --profile development|preview|production
```

## Workflow attendu

- **Mode Plan avant Build** pour toute tâche qui touche à une règle de jeu ou à
  l'architecture (pas pour un ajustement de style CSS). Basculer avec **Tab**.
- Découper en petites itérations, **un commit après chaque étape qui passe la
  vérification** — jamais un commit unique en fin de phase.
- Une nouvelle session par phase plutôt qu'une session qui grossit indéfiniment.
- Un effet "juice" à la fois (section 8 du guide technique), jamais plusieurs dans le même
  prompt — chacun doit pouvoir être vérifié et, au besoin, annulé indépendamment.
- Publicités : bannière écran de sélection uniquement, interstitielle plafonnée entre
  niveaux, jamais pendant la résolution d'un plateau (cohérence avec le positionnement
  "zéro pression" du jeu).

## Ce qu'on ne fait jamais

- Modifier, réécrire ou "améliorer" un fichier de `src/logic/` sans validation explicite.
- Réintroduire un chronomètre, des vies ou une limite de coups dans le mode Classique.
- Reprendre le nom "BlockWorks", son icône, ses captures ou son texte de fiche Store.
- Committer une étape dont la vérification (self-check ou test manuel) n'est pas passée.

## État actuel du projet

*(à tenir à jour au fil de l'avancement — sert de repère à la prochaine session)*

- ✅ `src/logic/` intégré et vérifié.
- ✅ `assets/levels.json` (150 niveaux) généré et vérifié.
- ✅ Écran de sélection (`src/app/index.tsx` + `src/ui/JourneyPath.tsx`, 10 premiers
  niveaux débloqués en dur via `src/services/levels.ts`) + placeholder
  `src/app/level/[id].tsx`. Export web OK (`/` + `/level/[id]`).
- ✅ Identité Pathful (`identite-visuelle-pathful.md`, 4 commits revert-ables) :
  fond dégradé Skia + grain (`ScreenBackground`, `assets/images/grain.png` via
  `scripts/generate-grain.js`), typo Nunito titres/chiffres (`@expo-google-fonts/nunito`,
  fallback système), `GameButton` partagé (plein + ombre, press 0.97, primary/secondary,
  variante icône seule `@expo/vector-icons` : nav secondaire en bandeau compact, une seule
  action texte par écran + « Indice (pub) » en texte),
  journey (halo nœud courant, connecteurs pointillés, badge ★ doré si 3 étoiles). Tokens dans
  `ThemeProvider` (`useThemeTokens`). Plateau de jeu exclu (hors périmètre).
- ✅ Icône/splash Pathful (motif « chemin + tête », `scripts/generate-icon.js` procédural :
  `icon.png`, adaptive icons, `splash-icon.png`, `favicon.png` — vérifiés visuellement).
- ✅ Politique de confidentialité `docs/privacy-policy.html` (FR + résumé EN, sans trackers).
  Remote `origin` → `github.com/basmafernandoluis/Pathful` (repo vide). Reste à activer
  Pages (`main` / `/docs`) puis pousser.
- ✅ `GridCanvas` interactif (geste en **worklet thread UI** : `pointToCell` worklet +
  `layoutSV`/`lastCellSV`, `runOnJS` vers le store **uniquement sur transition de case**,
  ordre préservé → `canExtend`/`extend`/`reelBackTo`/`isLevelSolved` uniquement,
  `Haptics.impactAsync(Light)` par pas **en fire-and-forget (jamais d'await
  dans `onUpdate`)**,   `SnakePaths`/`BoardGrid`/chiffres mémoïsés — snake actif en append O(1) via
  `PathBuilder` persistant (`build()` sans reset, rebuild si divergence).
  `zustand` + `expo-haptics` installés. Sons courts préchargés au montage
  (`initAudio()` dans `_layout.tsx`, `seekTo(0)+play()` **non chaînés** à l'usage —
  `play()` est synchrone, ne jamais revenir à `.then(() => play())`, repli lazy).
  `src/app/level/[id].tsx` charge le niveau, affiche « résolu » +
  Recommencer. Skia 2.6.2 → dev build EAS requis.
- ✅ `expo-dev-client` installé, `expo-doctor` 21/21. Test sur téléphone =
  build de dev local (`npx expo run:android`), Android Studio/SDK/adb présents.
- ✅ Layout écran jeu corrigé (origine grille `(0,0)`, zone plateau mesurée via
  `onLayout`, boutons en bas en flux normal — dernière ligne 5×5/10×10 visible).
  Sonde d'invariant temporaire `__DEV__` dans `gameStore.ts` (doublons inter-snakes,
  log `[INVARIANT]`, à retirer après diagnostic).
- ✅ Juice #1 « snake complet » : détection via `isSnakeComplete()` dans le store
  (`pulse` par snake), pulse Reanimated `withSequence(withSpring(1.04), withSpring(1))`
  centré sur le tracé (`src/ui/SnakePaths.tsx`), cloche douce `assets/sounds/complete.wav`
  via `expo-audio` (`src/services/audio.ts`), `Haptics.notificationAsync(Success)`.
- ✅ Juice #2 « victoire » : zoom-pulse plateau (`withSpring(1.03)`), vague Skia +
  10 particules (`src/ui/VictoryOverlay.tsx`), carillon `assets/sounds/victory.wav`,
  carte étoiles héro (`src/ui/VictoryStats.tsx` : ★ pop une par une + clochette chacune,
  silhouettes grises, titre Nunito, coups/indices en secondaire, radius 28 + ombre).
  `SkPath.lineTo` déprécié migré vers `Skia.PathBuilder` (plus de warning).
- ✅ Juice #3 « compteur tuiles » : `TileCounter.tsx` interpole `remainingTiles()`
  vers la cible (pas de 45 ms, max ~450 ms, chiffres tabulaires), câblé dans l'en-tête
  de `src/app/level/[id].tsx` via sélecteur (dérivé de `paths`, jamais stocké).
- ✅ Juice #4 « écrans au repos » : pastilles des têtes non tracées (`paths[h.id] ≤ 1`)
  respirent en boucle `withRepeat(withTiming(1.07, 1000 ms), yoyo)` via `HeadDot`
  (`src/ui/BoardGrid.tsx`, origine = centre pastille), tracées = fixes.
- ✅ Juice #5 « thème clair/sombre » : `ThemeFade` racine (`src/ui/ThemeFade.tsx`,
  monté dans `src/app/_layout.tsx`) — voile plein écran de l'ancien fond qui
  s'estompe `withTiming(250 ms)`, `pointerEvents="none"`, clé anti-aller-retour rapide.
- ✅ Juice #6 « chemin de progression » : `NodeItem` (`src/ui/JourneyPath.tsx`,
  shared value propre par nœud) — seul le nœud courant (nouvellement débloqué)
  rebondit à l'apparition `withDelay(350, withSpring(damping 7, overshoot))`,
  les autres restent fixes.
- ✅ Juice #7 « son d'ambiance » : `assets/sounds/ambient.mp3` fourni par
  l'utilisateur (remplace la nappe générée, jugée dérangeante), `startAmbient()`
  (`loop`, volume 0.18) au montage du layout racine, `stopAmbient()` réservé
  aux réglages phase 6.
- ✅ Juice #8 « frottement de tracé » : `assets/sounds/zip-loop.wav` en boucle
  (8 s reconstruites depuis `zip.mp3` 0,5 s sans tag gapless via
  `scripts/make-trace-loop.py` — tuilage + crossfade, jonction vérifiée sans clic),
  `startTraceLoop`/`stopTraceLoop`/`setTraceProgress`, volume 0.22, pitch 0.9→1.3
  (via `setPlaybackRate()` + `shouldCorrectPitch=false` — `playbackRate = x`
  n'a pas de setter natif)
  sur remplissage du snake actif — le reel-back fait redescendre), démarrée en
  `jsBegin` (si `activeId` + son ON), coupée en `jsEnd` + `setSound(false).
- ✅ Sauvegarde locale (`expo-sqlite` kv `game.db`, `src/services/storage.ts` +
  `storage.web.ts` localStorage, `src/state/settingsStore.ts` zustand) :
  complétés, thème (`system`/`light`/`dark` via `ThemeProvider`, écrans migrés
  vers `useAppTheme`), son/musique/vibration, indices par niveau, étoiles
  (`computeStars` optimal=somme `head.number`, `setStars` garde le max),
  palette plateau (`src/ui/boardPalettes.ts` pur : Classique/Forêt/Brume/Crépuscule,
  déblocage à 0/10/20/30 complétés, `setBoardPalette` garde-fou, choix en Réglages). Sélection
  branchée (`levelStateAt` réel : 5 premiers + précédent complété, complétion
  auto en `endStroke`), écran `src/app/settings.tsx` avec toggles câblés
  (musique ⇄ nappe, son ⇄ cloches, vibration ⇄ haptique). 100 % local.
- ✅ Pubs + Firebase (code prêt, **natif en attente de prebuild**) :
  `react-native-google-mobile-ads@16` (plugin `androidAppId`/`iosAppId` **TEST**,
  camelCase v16 — snake_case ignoré et fait crasher le SDK), `@react-native-firebase/app` +
  `/analytics` + `/crashlytics` (modulaire v26, `google-services.json` racine).
  Natif : `expo-build-properties` force `android.kotlinVersion=2.3.0` (requis par
  play-services-ads 25.4.0, métadonnées Kotlin 2.3 — le 2.1 du template fait
  échouer `:react-native-google-mobile-ads:compileDebugKotlin`).
  ⚠️ Ça ne suffit PAS : la propriété ne monte que la stdlib, le compilateur (KGP)
  reste en 2.1.20 → plugin local `plugins/withKotlinFix.js` (référencé en dernier
  dans `app.json`, `withProjectBuildGradle`) qui épingle
  `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.0')` + impose
  `mavenCentral()` avant `google()` à chaque prebuild (vérifié : prebuild --clean
  → fichier régénéré conforme → `assembleDebug` OK, APK 4 ABI dont `arm64-v8a`).
  Plus rien à réappliquer à la main ; si le template change de format, le plugin
  échoue avec un message explicite (Groovy attendu). `android/` reste gitignoré.
  Ordre `mavenCentral()` d'abord = contournement temporaire (`dl.google.com`
  injoignable depuis ce PC).
  `src/services/ads.ts` (+`.web.ts`) : bannière sélection, interstitielle 1/4
  complétions persistée, récompensée → solution COMPLÈTE auto-tracée via
  `store.applyHintSolution` (tracés adverses en conflit effacés, victoire évaluée,
  cases comptées dans `moves`) + `useHint`. Pas d'indice gratuit (supprimé),
  pas d'overlay (`hintPath`/`revealHint` supprimés).
  `src/services/analytics.ts` (+`.web.ts`) : `level_start`,
  `level_complete`, `hint_used`, `ad_impression` + attribut Crashlytics.
  Bouton « Indice (pub) » sur l'écran niveau. `prebuild --clean` rejoué OK
  (package `com.appwizards.pathful`, meta-data AdMob TEST, `google-services.json`
  câblé + plugin `4.4.4`, 4 ABI) — nécessitait `googleServicesFile` dans `app.json`
  + arrêt Metro (verrou EBUSY sur `android/`).
  Preview sur device : `assembleRelease -PreactNativeArchitectures=arm64-v8a`
  (APK ~66 Mo arm64 seul, ~21 min, standalone sans Metro — dev-client inclus).
  Build 4 ABI tué par disque C: plein (`No space left` de clang) → garder ≥ 2 Go
  libres (`npm cache clean`, TEMP, sous-dossiers `.cxx` non-arm64 supprimables).
- ⬜ Reste à faire : voir `plan-action-complet.md`, phases 1 à 10.