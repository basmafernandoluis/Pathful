import { buildLevel } from "./generator";
import { canExtend, extend, createInitialPaths, isLevelSolved, remainingTiles } from "./gameplay-rules";
import { getHintForHead } from "./hint";

/**
 * Ce script ne teste pas seulement le générateur : il "rejoue" chaque niveau
 * en utilisant UNIQUEMENT canExtend / extend / isLevelSolved (le même chemin de
 * code que l'UI utilisera), en suivant les indices de hint.ts comme le ferait
 * un joueur. Si un jour un agent IA modifie une des deux fonctions sans respecter
 * le contrat de l'autre, ce script échoue immédiatement — c'est exactement le
 * filet de sécurité anti-dérive recommandé dans le guide.
 */

const configs: Array<{ W: number; H: number; crateRate: number }> = [
  { W: 5, H: 5, crateRate: 0 },
  { W: 6, H: 6, crateRate: 0.05 },
  { W: 8, H: 8, crateRate: 0.1 },
  { W: 10, H: 10, crateRate: 0.12 },
  { W: 6, H: 10, crateRate: 0.08 },
  { W: 12, H: 12, crateRate: 0.15 },
];

let pass = 0;
let fail = 0;

for (const cfg of configs) {
  for (let seed = 1; seed <= 15; seed++) {
    const level = buildLevel(cfg.W, cfg.H, { crateRate: cfg.crateRate, seed: seed * 1000 + cfg.W * 31 + cfg.H });
    if (!level) {
      fail++;
      console.log(`ECHEC génération ${cfg.W}x${cfg.H} seed=${seed}`);
      continue;
    }

    let paths = createInitialPaths(level);

    // On "rejoue" chaque snake en suivant les indices, en passant à CHAQUE FOIS
    // par canExtend (comme le fera le geste de dessin réel) plutôt que d'injecter
    // solutionPath directement.
    for (const head of level.heads) {
      let guard = 0;
      while (guard++ < 100) {
        const hint = getHintForHead(level, paths, head.id);
        if (!hint) break; // ce snake est complet
        if (!canExtend(level, paths, head.id, hint)) {
          fail++;
          console.log(`ECHEC rejeu ${level.id}: canExtend refuse le pas suggéré par l'indice pour la tête ${head.id}`);
          break;
        }
        paths = extend(paths, head.id, hint);
      }
    }

    const solved = isLevelSolved(level, paths);
    const remaining = remainingTiles(level, paths);
    if (!solved) {
      fail++;
      console.log(`ECHEC résolution ${level.id}: isLevelSolved=false, remainingTiles=${remaining}`);
    } else {
      pass++;
    }
  }
}

console.log(`\n--- Résultat self-check TS: ${pass} OK / ${fail} échecs sur ${pass + fail} niveaux rejoués ---`);
if (fail > 0) process.exit(1);
