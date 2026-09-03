import type { CellPos, Level, SnakeHead } from "./types";

/**
 * PRNG déterministe et "seedable" (mulberry32). Volontairement PAS Math.random :
 * un niveau = un seed, ce qui permet de rejouer/partager un niveau, de le stocker
 * en base sous forme d'un seul entier, et de rendre les tests reproductibles.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/**
 * Cœur de l'algorithme : un chemin hamiltonien randomisé (visite CHAQUE case une
 * seule fois) sur la grille pleine, via backtracking + heuristique de Warnsdorff
 * (on essaie d'abord les voisins qui ont le MOINS d'options restantes — la même
 * heuristique qui rend le problème du "tour du cavalier" résoluble en pratique).
 *
 * Le backtracking est plafonné par un budget de pas (`stepBudget`) : si ça patine
 * sur un plateau difficile, on abandonne vite plutôt que de risquer un temps
 * exponentiel, et `buildLevel` retombe sur `generateHamiltonianPathBoustrophedon`
 * qui, lui, réussit toujours instantanément.
 */
function generateHamiltonianPathRandomized(
  W: number,
  H: number,
  rng: () => number,
  { maxStartAttempts = 12, stepBudget = 4000 } = {}
): CellPos[] | null {
  const total = W * H;
  const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  let path: [number, number][] = [];
  let steps = 0;
  let budgetBlown = false;

  function neighborsOf(r: number, c: number): [number, number][] {
    const res: [number, number][] = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W && !visited[nr][nc]) res.push([nr, nc]);
    }
    return res;
  }

  function dfs(r: number, c: number): boolean {
    if (++steps > stepBudget) {
      budgetBlown = true;
      return false;
    }
    visited[r][c] = true;
    path.push([r, c]);
    if (path.length === total) return true;

    let nbrs = neighborsOf(r, c);
    nbrs = shuffle(nbrs, rng);
    nbrs.sort((a, b) => neighborsOf(a[0], a[1]).length - neighborsOf(b[0], b[1]).length);

    for (const [nr, nc] of nbrs) {
      if (dfs(nr, nc)) return true;
      if (budgetBlown) return false;
    }
    visited[r][c] = false;
    path.pop();
    return false;
  }

  const starts = shuffle(
    Array.from({ length: total }, (_, i) => [Math.floor(i / W), i % W] as [number, number]),
    rng
  ).slice(0, maxStartAttempts);

  for (const [sr, sc] of starts) {
    path = [];
    steps = 0;
    budgetBlown = false;
    for (let i = 0; i < H; i++) visited[i].fill(false);
    if (dfs(sr, sc)) return path.map(([row, col]) => ({ row, col }));
  }
  return null;
}

/** Filet de sécurité : boustrophédon randomisé (4 coins x 2 orientations). Toujours valide, coût nul. */
function generateHamiltonianPathBoustrophedon(W: number, H: number, rng: () => number): CellPos[] {
  const flipRows = rng() < 0.5;
  const flipCols = rng() < 0.5;
  const transpose = rng() < 0.5;
  const [w, h] = transpose ? [H, W] : [W, H];
  const raw: [number, number][] = [];
  for (let row = 0; row < h; row++) {
    const leftToRight = row % 2 === 0;
    for (let k = 0; k < w; k++) {
      const col = leftToRight ? k : w - 1 - k;
      raw.push([row, col]);
    }
  }
  return raw.map(([r, c]) => {
    const rr = flipRows ? h - 1 - r : r;
    const cc = flipCols ? w - 1 - c : c;
    const [fr, fc] = transpose ? [cc, rr] : [rr, cc];
    return { row: fr, col: fc };
  });
}

function generateHamiltonianPath(
  W: number,
  H: number,
  rng: () => number,
  opts?: { maxStartAttempts?: number; stepBudget?: number }
): CellPos[] {
  return generateHamiltonianPathRandomized(W, H, rng, opts) ?? generateHamiltonianPathBoustrophedon(W, H, rng);
}

export interface BuildLevelOptions {
  /** Longueur minimale d'un segment, EN CASES (donc number mini = minSeg - 1). */
  minSeg?: number;
  /** Longueur maximale d'un segment, en cases. */
  maxSeg?: number;
  /** Probabilité qu'un segment se fasse "rogner" sa dernière case pour créer une crate. */
  crateRate?: number;
  seed: number;
}

/**
 * Construit un niveau garanti solvable :
 *  1. Un chemin hamiltonien couvre toute la grille (une seule "vraie" solution existe par construction).
 *  2. On le découpe en segments consécutifs = les futurs snakes.
 *  3. Pour certains segments, on rogne la dernière case et on la transforme en crate — sans jamais
 *     casser la validité, puisque cette case n'appartenait qu'à CE segment (chemin hamiltonien = chaque
 *     case visitée une seule fois au total).
 */
export function buildLevel(width: number, height: number, options: BuildLevelOptions): Level | null {
  const { minSeg = 2, maxSeg = 6, crateRate = 0.08, seed } = options;
  const rng = mulberry32(seed);
  const ham = generateHamiltonianPath(width, height, rng);

  const segments: CellPos[][] = [];
  let i = 0;
  while (i < ham.length) {
    const remaining = ham.length - i;
    let len = Math.min(maxSeg, remaining);
    if (remaining - len > 0 && remaining - len < minSeg) len = remaining;
    len = Math.max(minSeg, Math.min(len, remaining));
    segments.push(ham.slice(i, i + len));
    i += len;
  }

  const crates: CellPos[] = [];
  for (const seg of segments) {
    if (seg.length > minSeg && rng() < crateRate) {
      const shaved = seg.pop();
      if (shaved) crates.push(shaved);
    }
  }

  const heads: SnakeHead[] = segments.map((seg, idx) => ({
    id: idx,
    row: seg[0].row,
    col: seg[0].col,
    number: seg.length - 1,
    solutionPath: seg,
  }));

  return {
    id: `lvl_${width}x${height}_${seed}`,
    width,
    height,
    heads,
    crates,
  };
}
