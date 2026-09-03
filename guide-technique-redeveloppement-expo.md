# Guide technique — redévelopper le clone en React Native Expo avec opencode

> Compagnon de `regles-du-jeu-blockworks-clone.md`. Ce document couvre la stack,
> l'architecture, l'algorithme de génération de niveaux (déjà écrit et testé —
> voir `blockworks-clone-logique-verifiee.zip`), le rendu, le monétisation et la
> publication, ainsi qu'une méthode de travail avec opencode pensée spécifiquement
> pour éviter que la logique du jeu ne se dégrade au fil des sessions.
>
> Recherche et versions vérifiées début septembre 2026.

## 1. Stack recommandé

| Brique | Choix | Pourquoi |
|---|---|---|
| Framework | **Expo SDK 57** (React Native ~0.86, New Architecture) | Dernière version stable ; SDK 55+ a abandonné l'ancienne architecture, autant partir directement sur la bonne base |
| Langage | **TypeScript strict** | Les erreurs de logique de jeu (mauvais type de coordonnée, oubli d'un champ) sont attrapées à la compilation plutôt qu'en jouant |
| Rendu du plateau | **@shopify/react-native-skia** | Canvas GPU, dessine des chemins lissés (arrondis, dégradés, flous) — impossible avec des `View` empilées, et plus performant qu'un `Svg` classique pour ce volume d'éléments animés |
| Gestes | **react-native-gesture-handler** | Standard de facto pour le drag-to-draw, s'intègre nativement avec Skia et Reanimated |
| Animations | **react-native-reanimated** | Pour tout le "juice" (section 6) — tourne sur le thread UI, ne bloque jamais sur le thread JS |
| État | **zustand** | Suffisant pour ce volume d'état, aucune boilerplate — évite qu'un agent IA parte sur du Redux surdimensionné |
| Sauvegarde locale | **expo-sqlite (kv-store)** ou **react-native-mmkv** | `expo-av` est déprécié depuis le SDK 55 côté audio, et le pattern recommandé côté stockage clé-valeur suit la même logique : privilégier les modules officiels actuels plutôt que `AsyncStorage` |
| Haptique | **expo-haptics** | Le petit "tick" à chaque case tracée — voir section 6 |
| Son | **expo-audio** | Remplace `expo-av` (déprécié, retiré du SDK 55) |
| Pub | **react-native-google-mobile-ads** | Voir section 7 |
| Analytics/crash | **@react-native-firebase/app** + `/analytics` + `/crashlytics` | Cohérent avec ta stack Firebase existante |
| Build | **EAS Build + EAS Submit** | Obligatoire dès qu'un module natif (pub, haptique) est utilisé — Expo Go ne suffit plus |

## 2. Architecture du projet

```
src/
  logic/              <- AUCUNE dépendance React/Expo. Le "cœur" testable.
    types.ts
    generator.ts
    gameplay-rules.ts
    hint.ts
    self-check.ts
    self-check-edge-cases.ts
  ui/
    GridCanvas.tsx     <- rend `logic/` avec Skia + capte les gestes
    TileCounter.tsx
    JourneyPath.tsx
    ThemeProvider.tsx
  state/
    gameStore.ts       <- zustand, orchestre logic/ + persistance
  services/
    ads.ts
    analytics.ts
    storage.ts
  app/                 <- écrans (expo-router)
```

**La règle qui compte le plus dans tout ce document** : `src/logic/` ne doit
jamais importer quoi que ce soit de React Native. C'est ce découpage — pas une
consigne dans un prompt — qui empêche un agent IA de "corrompre" la logique du
jeu en modifiant un écran : la logique vit ailleurs, protégée par ses propres
tests (section 5).

## 3. Modèle de données

Voir `types.ts` dans l'archive fournie. Résumé :

```ts
interface CellPos { row: number; col: number; }

interface SnakeHead {
  id: number; row: number; col: number;
  number: number;           // nombre de PAS, pas de cases
  solutionPath: CellPos[];  // connue dès la génération, réutilisée pour l'indice
}

interface Level {
  id: string; width: number; height: number;
  heads: SnakeHead[]; crates: CellPos[];
}
```

## 4. Génération de niveaux — algorithme vérifié

**Principe** : plutôt que générer un plateau puis chercher (potentiellement
longtemps, potentiellement en échouant) s'il est solvable, on construit le
niveau **à partir d'une solution garantie** :

1. On calcule un **chemin hamiltonien** randomisé (qui visite chaque case de la
   grille exactement une fois) via backtracking + heuristique de Warnsdorff
   (on essaie d'abord les voisins ayant le moins d'options restantes — la même
   astuce qui rend le problème du "tour du cavalier" résoluble en pratique).
   Un budget de pas plafonne le backtracking ; en cas d'échec, un filet de
   sécurité en boustrophédon randomisé (toujours valide, coût nul) prend le
   relais.
2. On découpe ce chemin en segments consécutifs de longueur aléatoire (bornée
   par `minSeg`/`maxSeg`) → chaque segment devient un snake, sa première case
   devient la tête, son chiffre = longueur du segment − 1.
3. Pour certains segments, on **rogne leur dernière case** et on la transforme
   en crate. C'est toujours valide : par construction du chemin hamiltonien,
   cette case n'appartenait qu'à CE segment — la retirer ne peut jamais casser
   un autre snake.

Résultat : chaque niveau généré a **au moins une solution connue et garantie**
par construction — pas besoin de le vérifier après coup avec un solveur séparé.

**Vérification effectuée avant de te livrer ce guide** (pas juste "en théorie") :
j'ai écrit `generator.ts`, puis un script `self-check.ts` qui génère des
niveaux sur 6 tailles de grille (de 5×5 à 12×12, de 0 à 15% de crates), les
**rejoue entièrement** en utilisant uniquement les fonctions runtime de
`gameplay-rules.ts` (le même chemin de code que l'UI utilisera, pas un accès
direct à la solution), et vérifie la victoire.

```
--- Résultat self-check TS: 90 OK / 0 échecs sur 90 niveaux rejoués ---
--- Résultat self-check cas limites: 12 OK / 0 échecs ---
```

Temps de génération observés : entre 0 et 48 ms par niveau, y compris sur
12×12 — largement compatible avec une génération à la volée sur l'appareil,
pas seulement en build-time.

**Sur l'unicité de la solution** : cette méthode garantit qu'**une** solution
existe, pas qu'elle est **unique**. Pour du contenu éditorial (le tutoriel, les
10-20 premiers niveaux), c'est probablement souhaitable de vérifier l'unicité
à la main ou avec un petit solveur par force brute (le plateau est petit, un
simple backtracking suffit). Pour la génération de masse en arrière-plan,
l'unicité n'est generalement pas nécessaire pour qu'un puzzle reste satisfaisant.

## 5. Moteur de règles runtime

Voir `gameplay-rules.ts`. Quatre fonctions pures couvrent tout le jeu :

- `canExtend(level, paths, headId, next)` — la case `next` peut-elle prolonger
  ce chemin ? Centralise toutes les contraintes (adjacence, longueur max,
  crate, auto-croisement, collision avec un autre snake).
- `extend(paths, headId, next)` — ajoute la case (immuable, retourne un nouvel
  état).
- `reelBackTo(paths, headId, cell)` — le mécanisme "reel back".
- `isLevelSolved(level, paths)` — condition de victoire.

Comme ce sont des fonctions pures sans état caché, elles sont trivialement
testables (voir `self-check-edge-cases.ts` : croisement refusé, crate refusée,
dépassement de longueur refusé, collision avec un autre snake refusée, reel
back vérifié) et trivialement réutilisables telles quelles dans le store
zustand.

## 6. Système d'indices

Voir `hint.ts`. Comme chaque niveau conserve sa `solutionPath` d'origine,
donner un indice revient à comparer le tracé du joueur à cette solution et
révéler le prochain pas — pas besoin d'écrire un solveur de contraintes
générique séparé (coûteux à faire tourner sur mobile). Limite assumée et
documentée dans le fichier : si le joueur suit une solution valide mais
différente de celle stockée, l'indice le ramènera vers la solution de
référence plutôt que de continuer la sienne.

## 7. Rendu du plateau et geste de tracé

Squelette d'intégration (à adapter, pas un composant final) :

```tsx
import { Canvas, Path, Skia, Group } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { canExtend, extend, reelBackTo, createInitialPaths, isLevelSolved } from "../logic/gameplay-rules";
import type { Level, CellPos } from "../logic/types";

const CELL = 44;
const toPoint = (c: CellPos) => ({ x: c.col * CELL + CELL / 2, y: c.row * CELL + CELL / 2 });
const toCell = (x: number, y: number): CellPos => ({ row: Math.floor(y / CELL), col: Math.floor(x / CELL) });

function toSkPath(cells: CellPos[]) {
  const p = Skia.Path.Make();
  if (!cells.length) return p;
  const s = toPoint(cells[0]);
  p.moveTo(s.x, s.y);
  cells.slice(1).forEach((c) => { const pt = toPoint(c); p.lineTo(pt.x, pt.y); });
  return p;
}

export function GridCanvas({ level }: { level: Level }) {
  const [paths, setPaths] = useState(() => createInitialPaths(level));
  const [activeId, setActiveId] = useState<number | null>(null);

  // IMPORTANT : Gesture.Pan() exécute ses callbacks en worklet dès que
  // Reanimated est installé — un `useState` classique lu/modifié depuis là
  // est un piège classique (closures figées). Pour ce jeu, le tracé n'a pas
  // besoin de tourner à 60 fps sur le thread UI (ce sont des pas discrets,
  // pas un drag continu type carte à jouer) : on force tout sur le thread JS
  // avec `.runOnJS(true)`, ce qui rend `setState` normal et sûr à utiliser.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      const cell = toCell(e.x, e.y);
      const head = level.heads.find((h) => h.row === cell.row && h.col === cell.col);
      if (head) setActiveId(head.id);
    })
    .onUpdate((e) => {
      if (activeId === null) return;
      const cell = toCell(e.x, e.y);
      const current = paths[activeId];
      const onPath = current.some((p) => p.row === cell.row && p.col === cell.col);
      if (onPath) {
        setPaths((prev) => reelBackTo(prev, activeId, cell));
      } else if (canExtend(level, paths, activeId, cell)) {
        setPaths((prev) => extend(prev, activeId, cell));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      setActiveId(null);
      if (isLevelSolved(level, paths)) { /* séquence de victoire, section 8 */ }
    });

  return (
    <GestureDetector gesture={pan}>
      <Canvas style={{ width: level.width * CELL, height: level.height * CELL }}>
        {level.heads.map((h) => (
          <Path key={h.id} path={toSkPath(paths[h.id])} style="stroke"
                strokeWidth={CELL * 0.6} strokeCap="round" strokeJoin="round" />
        ))}
      </Canvas>
    </GestureDetector>
  );
}
```

Ce squelette montre le point important : la couche UI ne fait qu'appeler
`canExtend` / `extend` / `reelBackTo` / `isLevelSolved`. Elle ne réimplémente
jamais une règle. C'est ce qui doit rester vrai après chaque session avec
opencode.

## 8. Le "juice" — concret, adapté à un puzzle "calme"

Le texte du jeu original se positionne explicitement comme *"a calm grid
puzzle"* — la direction artistique et sonore doit rester apaisante, pas
tape-à-l'œil. "Juice" ne veut pas dire "beaucoup d'effets", mais des
micro-retours cohérents et satisfaisants :

- **Chaque pas tracé** : `Haptics.impactAsync(Light)` + trait au tracé arrondi
  (`strokeCap="round"`), une couleur douce et distincte par snake (palette
  pastel plutôt que les couleurs vives par défaut de RN).
- **Un snake complété légalement** : léger pulse d'échelle
  (`withSequence(withSpring(1.04), withSpring(1))` sur le groupe Skia), un son
  bref type xylophone/cloche douce, `Haptics.notificationAsync(Success)`.
- **Compteur de tuiles** : animer la décrémentation (roulement du chiffre, pas
  un saut instantané) — Reanimated `useAnimatedReaction` ou une simple
  interpolation entre l'ancienne et la nouvelle valeur.
- **Plateau résolu** : léger zoom-pulse de la caméra, vague de couleur qui
  parcourt le plateau, particules discrètes (pas un feu d'artifice — rester
  cohérent avec "calm"), carillon ascendant, puis apparition en cascade des
  statistiques (coups, indices utilisés).
- **Écrans au repos** : respiration lente (~2s) sur les têtes non encore
  tracées, pour inviter à jouer sans être intrusif.
- **Changement de thème clair/sombre** : fondu enchaîné (~250ms), jamais un
  changement brutal.
- **Chemin de progression** : les nœuds nouvellement débloqués apparaissent
  avec un léger effet de rebond (spring avec overshoot).
- **Son d'ambiance** : nappe douce en fond, pas de synthé agressif — cohérent
  avec le positionnement "zéro pression".

C'est précisément ce niveau de détail — petit, répété, cohérent — qui distingue
un jeu qui "a l'air fini" d'un prototype fonctionnel mais plat.

## 9. Sauvegarde, Firebase, publicités

- **Sauvegarde locale** : niveaux complétés, thème, réglages son/vibration,
  indices restants. Volume de données minuscule → `expo-sqlite` (kv-store) ou
  MMKV conviennent très bien, pas besoin de backend pour ça.
- **Firebase** : `@react-native-firebase/analytics` pour suivre
  démarrage/complétion de niveau, usage des indices, impressions de pub —
  c'est ce qui permet de savoir QUEL écran perd les joueurs, utile vu le
  faible taux de rétention observé sur les précédents jeux.
  `@react-native-firebase/crashlytics` en plus, coût de mise en place quasi
  nul et évite qu'un crash silencieux plombe les quelques joueurs acquis.
- **AdMob** (`react-native-google-mobile-ads`) : nécessite EAS Build (pas
  compatible Expo Go), configuration via plugin dans `app.json`
  (`android_app_id`, `ios_app_id`). Recommandations placement, cohérentes avec
  le "no pressure" du jeu :
  - **Bannière** uniquement sur l'écran de sélection de niveau, jamais pendant
    qu'un plateau est en cours de résolution.
  - **Interstitielle** entre niveaux, plafonnée (ex. 1 toutes les 3-4
    complétions) — pas à chaque victoire, ça tue la rétention sur un jeu
    justement vendu comme relaxant.
  - **Récompensée** pour débloquer un indice bonus : s'intègre naturellement
    puisque le système d'indices existe déjà, c'est le hook de monétisation le
    plus naturel pour ce genre de puzzle.

```json
// app.json — extrait
{
  "expo": {
    "plugins": [
      ["react-native-google-mobile-ads", {
        "android_app_id": "ca-app-pub-XXXXXXXX~XXXXXXXX",
        "ios_app_id": "ca-app-pub-XXXXXXXX~XXXXXXXX"
      }]
    ]
  }
}
```

## 10. Build et publication sur Google Play

Points vérifiés début septembre 2026, donc **actuels** au moment de la
publication de ce guide :

- **Niveau d'API cible obligatoire : Android 16 (API 36)** pour toute nouvelle
  app ou mise à jour soumise à Google Play — cette règle est entrée en
  vigueur le **31 août 2026**, donc littéralement maintenant. Expo aligne en
  général le `targetSdkVersion` de son template sur l'exigence Google à chaque
  sortie de SDK, mais **vérifie-le explicitement** avant de soumettre (`npx
  expo-doctor`, ou inspecte le `build.gradle` généré après `npx expo prebuild`)
  plutôt que de le supposer — la bascule vient tout juste d'avoir lieu.
- **Déclaration publicités** : dans Play Console → App content → Ads, cocher
  "Oui, mon app contient des publicités" (obligatoire avant publication dès
  que AdMob est intégré).
- **Formulaire Data safety** : à remplir en fonction des données réellement
  collectées (Analytics, Crashlytics, AdMob collectent des identifiants
  appareil — à déclarer honnêtement, Google vérifie).
- **Test fermé obligatoire pour un compte développeur individuel récent** :
  12 testeurs opt-in pendant 14 jours consécutifs, **une seule fois par
  compte** (pas par app) avant de débloquer l'accès à la production. Comme tu
  publies déjà depuis un compte existant avec plusieurs jeux en ligne, tu as
  presque certainement déjà passé cette étape — à vérifier dans Play Console
  si jamais ce jeu part sur un compte différent.
- **Build** : `eas build --platform android --profile production` (génère un
  `.aab`), puis `eas submit -p android` pour l'envoi automatisé vers Play
  Console (nécessite d'avoir lié une clé de service Google Cloud une première
  fois).

## 11. Travailler avec opencode sans perdre la logique en route

C'est le point qui compte le plus vu tes jeux précédents : plus un projet
"vibe-codé" grandit, plus il devient facile pour un agent IA de dériver
(réinterpréter une règle différemment d'une session à l'autre, "réparer" un
bug en cassant une autre règle). Quatre leviers concrets, spécifiques à
opencode :

1. **Utilise ces deux documents comme `AGENTS.md`.** À la racine du projet,
   `opencode /init` génère un `AGENTS.md` — remplace/complète-le par le
   contenu de `regles-du-jeu-blockworks-clone.md` (les règles ne changent
   jamais) et un résumé de l'architecture de la section 2 de ce guide. Chaque
   nouvelle session d'opencode relit ce fichier : c'est ta source de vérité
   unique, au lieu de re-expliquer les règles différemment à chaque prompt.

2. **Les fichiers de `src/logic/` sont déjà écrits et testés — ne les fais
   PAS régénérer.** Donne-les tels quels à opencode dès le premier prompt
   ("intègre ces fichiers fournis, ne les réécris pas") et demande-lui de
   construire l'UI et les écrans *autour*. Moins l'IA réinvente la logique de
   jeu, moins elle a d'occasions de la corrompre. Garde `self-check.ts` et
   `self-check-edge-cases.ts` comme garde-fou : redemande-les à exécuter après
   toute modification touchant `logic/`.

3. **Utilise l'agent *Plan* avant l'agent *Build*** pour toute tâche qui
   touche à une règle de jeu (pas pour un ajustement de style CSS). Le mode
   Plan d'opencode lit sans modifier et te fait valider l'approche avant que
   *Build* touche au code — ça évite les réécritures silencieuses de logique
   pendant une tâche qui semblait purement visuelle.

4. **Découpe en petites itérations, commit après chaque étape verte.**
   Exemple d'ordre : (1) intégrer `logic/` tel quel + faire passer les
   self-checks → commit ; (2) écran de sélection de niveau statique → commit ;
   (3) `GridCanvas` + geste, sans juice → commit, tester à la main que
   plusieurs niveaux se résolvent ; (4) juice (section 8), un effet à la
   fois ; (5) sauvegarde ; (6) pub/analytics ; (7) build. À chaque commit qui
   casse un self-check, reviens en arrière plutôt que de laisser opencode
   "corriger" par-dessus — c'est souvent là que la logique dérive
   silencieusement.

## 12. Fichiers livrés avec ce message

- `regles-du-jeu-blockworks-clone.md` — spécification complète des règles.
- `guide-technique-redeveloppement-expo.md` — ce document.
- `blockworks-clone-logique-verifiee.zip` — `types.ts`, `generator.ts`,
  `gameplay-rules.ts`, `hint.ts`, `self-check.ts`, `self-check-edge-cases.ts`,
  et un `README.md` d'intégration. Génération et règles runtime déjà écrites,
  déjà vérifiées (102 checks passés au total), prêtes à être déposées dans
  `src/logic/`.

## 13. Un mot honnête sur le marché

BlockWorks (l'original) affiche environ 1K+ installations — c'est un jeu de
niche, pas un succès viral, même avec une exécution soignée et un vrai studio
derrière. Reproduire fidèlement ses mécaniques ne garantit donc pas plus de
traction que l'original. Ce qui peut réellement faire une différence pour la
visibilité, dans l'ordre où ça coûte le moins d'effort :

1. **Une identité visuelle et un nom propres** (obligatoire de toute façon,
   voir l'avertissement en tête du premier document) — c'est aussi l'occasion
   de se différencier plutôt que de rivaliser sur un marché identique.
2. **Fiche Store soignée** : captures qui montrent la mécanique en action (pas
   juste des screenshots statiques), première phrase de la description qui
   dit immédiatement "puzzle de tracé sans chrono" plutôt qu'un pitch vague.
3. **Une génération procédurale illimitée** (déjà couverte par ce guide) est
   un vrai argument face à un concurrent à "100+ niveaux" fixes.
4. **Le mode Arena** (section 7.2 du document des règles), s'il inclut un
   classement, donne une raison de revenir chaque jour — ce que le mode
   Classique, par design "zéro pression", ne fournit pas nativement.

## 14. Suites possibles

Je peux, à la demande :
- générer un lot de niveaux JSON prêts à l'emploi (ex. 150 niveaux, tailles et
  taux de crates progressifs) avec ce même générateur ;
- écrire le `AGENTS.md` complet prêt à coller à la racine du projet ;
- détailler l'écran de sélection de niveaux / le "journey path" ;
- rédiger le texte de fiche Google Play (description, mots-clés) pour ta
  propre version.
