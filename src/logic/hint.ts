import type { CellPos, Level } from "./types";
import type { PathsState } from "./gameplay-rules";

/**
 * Comme chaque niveau est généré À PARTIR d'une solution connue (head.solutionPath),
 * "donner un indice" ne demande PAS d'écrire un solveur de contraintes générique
 * (ce serait un moteur à part entière, coûteux à faire tourner sur mobile).
 * On compare juste le tracé actuel du joueur à la solution stockée et on révèle
 * le prochain pas correct.
 *
 * Limite honnête : si le joueur a dessiné un chemin valide mais DIFFÉRENT de
 * solutionPath (le puzzle peut avoir plusieurs solutions), l'indice le fera
 * revenir vers LA solution de référence plutôt que de continuer la sienne.
 * Pour un mode "indice strict", faire vérifier par le générateur que chaque
 * niveau a une solution unique avant de le publier (voir section 3.4 du guide).
 */
export function getHintForHead(level: Level, paths: PathsState, headId: number): CellPos | null {
  const head = level.heads.find((h) => h.id === headId);
  const current = paths[headId];
  if (!head || !current) return null;

  const nextIndex = current.length;
  if (nextIndex >= head.solutionPath.length) return null; // déjà complet

  return head.solutionPath[nextIndex];
}
