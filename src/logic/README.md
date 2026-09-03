# Logique de jeu — vérifiée et testée

Ces fichiers sont le **cœur pur** du jeu (aucune dépendance React Native, Expo ou UI).
À copier tels quels dans `src/logic/` de ton projet Expo.

## Fichiers

- `types.ts` — la seule définition de ce qu'est un niveau (`Level`, `SnakeHead`, `CellPos`).
- `generator.ts` — génère un niveau garanti solvable (chemin hamiltonien randomisé, voir section 3.4 du guide).
- `gameplay-rules.ts` — les règles en temps réel : `canExtend`, `extend`, `reelBackTo`, `isLevelSolved`, `remainingTiles`.
- `hint.ts` — le système d'indices (réutilise la solution connue du générateur, pas de solveur séparé).
- `self-check.ts` — génère des niveaux puis les rejoue via `gameplay-rules.ts` pour prouver que les deux fichiers sont cohérents entre eux.
- `self-check-edge-cases.ts` — teste spécifiquement les refus (croisement, crate, longueur max) et `reelBackTo`.

## Vérification (déjà faite, mais à rejouer si tu modifies ces fichiers)

```bash
npm install --save-dev typescript ts-node @types/node
npx tsc -p tsconfig.json
node dist/logic/self-check.js
node dist/logic/self-check-edge-cases.js
```

Résultats au moment de la livraison de ce guide : **90/90** niveaux rejoués avec succès
(self-check.ts) et **12/12** cas limites corrects (self-check-edge-cases.ts), sur des
grilles de 5x5 à 12x12 avec 0 à 15% de crates.

## Pourquoi ce découpage

C'est la structure qui protège le mieux un projet "vibe-codé" contre la dérive de
logique : tant que `self-check.ts` reste vert, l'IA a le droit de réécrire tout le reste
de l'application (UI, écrans, animations) sans jamais casser les règles du jeu. Voir la
section 4 du guide principal pour la méthode de travail recommandée avec opencode.
