/**
 * Types de données centraux — c'est la SEULE définition de ce qu'est un niveau.
 * Générateur, moteur de règles, rendu Skia et sauvegarde s'appuient tous sur ces types.
 * Garder ce fichier comme source de vérité unique évite qu'un agent IA "réinvente"
 * une forme de données légèrement différente à chaque nouvelle fonctionnalité.
 */

export interface CellPos {
  row: number;
  col: number;
}

export interface SnakeHead {
  /** Identifiant stable du snake dans ce niveau (0, 1, 2...) */
  id: number;
  row: number;
  col: number;
  /** Le nombre affiché sur la tête = nombre de PAS depuis la tête (pas le nombre de cases). */
  number: number;
  /**
   * Chemin solution connu à la génération. Sert de vérité terrain pour les tests
   * ET de source pour le système d'indices en jeu (voir hint.ts) — inutile d'écrire
   * un solveur générique séparé.
   */
  solutionPath: CellPos[];
}

export interface Level {
  id: string;
  width: number;
  height: number;
  heads: SnakeHead[];
  crates: CellPos[];
}
