import type { CellPos, Level } from "./types";

/**
 * État runtime : pour chaque tête (par id), le chemin actuellement dessiné.
 * Toujours initialiser avec `paths[head.id] = [{row: head.row, col: head.col}]`
 * (la tête elle-même compte comme le premier point du chemin).
 */
export type PathsState = Record<number, CellPos[]>;

export function createInitialPaths(level: Level): PathsState {
  const paths: PathsState = {};
  for (const head of level.heads) {
    paths[head.id] = [{ row: head.row, col: head.col }];
  }
  return paths;
}

function eq(a: CellPos, b: CellPos): boolean {
  return a.row === b.row && a.col === b.col;
}

function isOrthogonallyAdjacent(a: CellPos, b: CellPos): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/**
 * Règle centrale : la case `next` peut-elle prolonger le tracé du snake `headId` ?
 * Regroupe TOUTES les contraintes du jeu en un seul endroit testable :
 *  - adjacence orthogonale au dernier point
 *  - pas déjà atteinte la longueur max (number + 1 cases)
 *  - pas une crate
 *  - pas d'auto-croisement (case déjà dans SON propre chemin)
 *  - pas déjà prise par un AUTRE snake
 */
export function canExtend(level: Level, paths: PathsState, headId: number, next: CellPos): boolean {
  const head = level.heads.find((h) => h.id === headId);
  const path = paths[headId];
  if (!head || !path) return false;

  if (path.length >= head.number + 1) return false;

  const last = path[path.length - 1];
  if (!isOrthogonallyAdjacent(last, next)) return false;

  if (level.crates.some((c) => eq(c, next))) return false;
  if (path.some((p) => eq(p, next))) return false;

  for (const [otherId, otherPath] of Object.entries(paths)) {
    if (Number(otherId) === headId) continue;
    if (otherPath.some((p) => eq(p, next))) return false;
  }

  return true;
}

export function extend(paths: PathsState, headId: number, next: CellPos): PathsState {
  return { ...paths, [headId]: [...paths[headId], next] };
}

/**
 * Mécanique "reel back" du jeu original : toucher n'importe quel point déjà
 * tracé du corps du snake ramène le tracé jusqu'à ce point (le reste est effacé).
 * Ne fait rien si `cell` n'appartient pas au chemin actuel.
 */
export function reelBackTo(paths: PathsState, headId: number, cell: CellPos): PathsState {
  const path = paths[headId];
  if (!path) return paths;
  const idx = path.findIndex((p) => eq(p, cell));
  if (idx === -1) return paths;
  return { ...paths, [headId]: path.slice(0, idx + 1) };
}

export function isSnakeComplete(level: Level, paths: PathsState, headId: number): boolean {
  const head = level.heads.find((h) => h.id === headId);
  const path = paths[headId];
  if (!head || !path) return false;
  return path.length === head.number + 1;
}

/** Condition de victoire : chaque snake est complet ET l'union couvre 100% des cases (crates comprises). */
export function isLevelSolved(level: Level, paths: PathsState): boolean {
  const covered = new Set<string>();
  for (const c of level.crates) covered.add(`${c.row},${c.col}`);

  for (const head of level.heads) {
    if (!isSnakeComplete(level, paths, head.id)) return false;
    for (const p of paths[head.id]) covered.add(`${p.row},${p.col}`);
  }

  return covered.size === level.width * level.height;
}

/** Nombre de cases encore libres — alimente directement le compteur de tuiles à l'écran. */
export function remainingTiles(level: Level, paths: PathsState): number {
  const covered = new Set<string>();
  for (const c of level.crates) covered.add(`${c.row},${c.col}`);
  for (const headId of Object.keys(paths)) {
    for (const p of paths[Number(headId)]) covered.add(`${p.row},${p.col}`);
  }
  return level.width * level.height - covered.size;
}
