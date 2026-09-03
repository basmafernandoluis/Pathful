import { buildLevel } from "./generator";
import { canExtend, extend, reelBackTo, createInitialPaths, isSnakeComplete } from "./gameplay-rules";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) pass++;
  else {
    fail++;
    console.log(`ECHEC: ${label}`);
  }
}

// Niveau simple et déterministe pour tester les cas limites à la main.
const level = buildLevel(6, 6, { crateRate: 0.1, seed: 777 });
if (!level) throw new Error("génération impossible pour le test de cas limites");

const headA = level.heads[0];
let paths = createInitialPaths(level);

// 1) Un pas non-adjacent (diagonale ou distant) doit être refusé.
const farCell = { row: (headA.row + 3) % level.height, col: (headA.col + 3) % level.width };
check("refuse un pas non-adjacent", canExtend(level, paths, headA.id, farCell) === false);

// 2) Suivre la vraie solution doit toujours être accepté par canExtend.
for (let k = 1; k < headA.solutionPath.length; k++) {
  const stepCell = headA.solutionPath[k];
  check(`accepte le pas ${k} de la solution connue`, canExtend(level, paths, headA.id, stepCell));
  paths = extend(paths, headA.id, stepCell);
}
check("le snake A est complet après avoir suivi solutionPath", isSnakeComplete(level, paths, headA.id));

// 3) Une fois complet, tenter d'ajouter un pas de plus doit être refusé (longueur max atteinte).
if (headA.solutionPath.length >= 2) {
  const beyond = headA.solutionPath[headA.solutionPath.length - 1];
  check(
    "refuse de dépasser la longueur maximale (number + 1)",
    canExtend(level, paths, headA.id, beyond) === false
  );
}

// 4) reelBackTo doit ramener le chemin exactement au point touché.
const midIndex = Math.max(1, Math.floor(headA.solutionPath.length / 2));
const midCell = headA.solutionPath[midIndex];
const reeled = reelBackTo(paths, headA.id, midCell);
check("reelBackTo raccourcit le chemin à la bonne longueur", reeled[headA.id].length === midIndex + 1);
check(
  "reelBackTo ne modifie pas les autres snakes",
  JSON.stringify(reeled[level.heads[1]?.id ?? 0]) === JSON.stringify(paths[level.heads[1]?.id ?? 0])
);

// 5) Une case déjà prise par un AUTRE snake doit être refusée pour celui-ci.
if (level.heads.length > 1) {
  const headB = level.heads[1];
  let pathsAB = createInitialPaths(level);
  // On avance B d'un cran s'il a au moins un pas possible dans sa solution.
  if (headB.solutionPath.length > 1) {
    const bStep = headB.solutionPath[1];
    pathsAB = extend(pathsAB, headB.id, bStep);
    check(
      "refuse une case déjà occupée par un autre snake",
      canExtend(level, pathsAB, headA.id, bStep) === false
    );
  }
}

// 6) Une case "crate" doit toujours être refusée, pour n'importe quel snake adjacent.
if (level.crates.length > 0) {
  const crate = level.crates[0];
  const adjacentHead = level.heads.find(
    (h) => Math.abs(h.row - crate.row) + Math.abs(h.col - crate.col) === 1
  );
  if (adjacentHead) {
    const freshPaths = createInitialPaths(level);
    check(
      "refuse une case crate même si adjacente à une tête",
      canExtend(level, freshPaths, adjacentHead.id, crate) === false
    );
  } else {
    console.log("(info) aucune tête directement adjacente à une crate sur ce seed — cas non exercé)");
  }
}

console.log(`\n--- Résultat self-check cas limites: ${pass} OK / ${fail} échecs ---`);
if (fail > 0) process.exit(1);
