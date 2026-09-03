# Règles du jeu — clone de BlockWorks (Number Draw Game)

> Basé sur l'analyse de la fiche Google Play de **BlockWorks - Number Draw Game**
> (`com.fifth.blockworks`, éditeur Fifth Games / fifth.com.tr, ~1K+ installations,
> catégorie Puzzle, gratuit avec publicités). Le texte marketing original a été
> reformulé et complété ici en spécification précise, exploitable telle quelle par
> un développeur ou un agent IA — voir la section 6 pour les points où j'ai dû
> **trancher une ambiguïté** du texte source.

⚠️ **Sur le nom et l'identité visuelle** : les mécaniques de jeu (règles, systèmes)
ne sont pas protégeables et peuvent être librement réinterprétées — c'est une
pratique courante et légitime dans le jeu vidéo. En revanche, le **nom**
"BlockWorks", l'icône, les captures d'écran et le texte de fiche appartiennent à
Fifth Games. Choisis ton propre nom, ta propre identité visuelle et réécris ta
propre fiche Store : ne republie jamais leurs assets ou leur texte. Google Play
peut suspendre un compte pour usurpation/duplication de fiche.

---

## 1. Concept en une phrase

Un puzzle de grille sans chronomètre : chaque case de départ ("tête") porte un
chiffre, tu traces à partir d'elle un chemin de cette longueur exacte, et
l'objectif est que l'ensemble des chemins + des obstacles couvre **100%** du
plateau — pas un carré de moins.

## 2. Le plateau

- Une grille rectangulaire de `W × H` cases (le jeu original ne précise pas la
  taille exacte ; elle grandit probablement avec la progression — recommandation :
  démarrer à 5×5 pour le tutoriel, monter progressivement jusqu'à ~10×10 ou plus).
- Chaque case est l'un de ces trois états :
  1. **Tête** (`head`) — porte un chiffre visible, point de départ d'un chemin.
  2. **Crate** — case obstacle, infranchissable, fixe.
  3. **Case libre** — doit finir couverte par le chemin d'une tête.

## 3. Tracer un chemin ("snake")

1. Le joueur pose le doigt sur une tête et fait glisser.
2. Le chemin avance **une case à la fois**, uniquement vers une case
   **orthogonalement adjacente** (haut/bas/gauche/droite — jamais en diagonale)
   à la dernière case tracée.
3. Le chiffre affiché sur la tête est le nombre de **pas** que le chemin doit
   faire — pas le nombre total de cases. Un chemin complet occupe donc
   `chiffre + 1` cases (la tête comptant comme la première case).
4. Un chemin ne peut jamais :
   - sortir de la grille ;
   - traverser une case **crate** ;
   - repasser sur une case qu'il a **déjà** occupée lui-même (pas
     d'auto-croisement) ;
   - occuper une case déjà prise par le chemin d'une **autre** tête.
5. En revanche, deux chemins de têtes différentes peuvent parfaitement longer
   la même frontière et être **adjacents** l'un à l'autre — c'est même tout
   l'enjeu du puzzle ("trouver la forme qui laisse le prochain snake s'emboîter
   à côté"). Seule l'occupation de la **même case** est interdite.
6. Tant qu'un chemin n'a pas atteint sa longueur maximale, le joueur peut
   continuer à le prolonger normalement.

## 4. "Reel back" (revenir en arrière)

- Le joueur peut, à tout moment, toucher **n'importe quel point déjà tracé** du
  corps d'un chemin (pas seulement la dernière case).
- Le chemin est alors instantanément raccourci jusqu'à ce point : tout ce qui
  suivait est effacé, et le joueur peut redessiner une autre direction à partir
  de là.
- C'est le seul mécanisme de correction — il n'y a pas de bouton "annuler" séparé
  nécessaire.

## 5. Condition de victoire

Un niveau est résolu quand, **simultanément** :

- chaque tête a un chemin complet (longueur exacte = son chiffre + 1 cases) ;
- l'union de tous les chemins, plus les crates, couvre **exactement 100%** des
  cases de la grille — aucun trou, aucun chevauchement.

## 6. Aucune pression

- Pas de chronomètre, pas de vies, pas de limite de coups.
- Un plateau ne peut pas être "perdu" — seulement "pas encore fini".
- Réinitialisation illimitée.
- Un bouton **indice** est disponible quand le joueur est bloqué (voir le guide
  technique, section sur le système d'indices : comme chaque niveau est généré
  à partir d'une solution connue, l'indice n'a pas besoin d'un solveur séparé,
  il révèle simplement le prochain pas de la solution de référence).

## 7. Modes de jeu

### 7.1 Mode Classique (documenté par la fiche originale)

- **100+ niveaux**, chacun garanti solvable, présentés comme "vérifiés à la main"
  dans le jeu original — dans une version régénérée, ceci se traduit par un
  générateur procédural validé automatiquement (voir guide technique) plutôt
  qu'une vérification manuelle, ce qui permet d'en avoir bien plus que 100 sans
  effort de production supplémentaire.
- **Tutoriel de 5 plateaux** qui enseigne la règle puis "s'efface" (design
  minimaliste : pas de didacticiel intrusif au-delà de ces 5 premiers niveaux).
- **Compteur de tuiles en direct** : nombre de cases encore libres, mis à jour à
  chaque pas tracé.
- **Chemin de progression** ("journey path") qui matérialise visuellement l'
  avancée du joueur à travers les niveaux (typiquement une piste sinueuse avec
  un marqueur de position, façon Candy Crush mais sans mécanique de vies/argent).
- Difficulté croissante honnête : grilles plus grandes, plus de têtes, plus de
  crates, et des découpages de longueurs moins "évidents" au fil de la
  progression.

### 7.2 Arena Mode

⚠️ **Non documenté publiquement.** La fiche Google Play mentionne seulement
"Introducing Arena Mode" dans son changelog du 24 août 2026, sans description.
Ce qui suit n'est **pas** un fait vérifié sur le jeu original — ce sont des
**propositions de design** parmi lesquelles choisir pour ta propre version :

| Option | Principe | Cohérence avec le "no pressure" du mode Classique |
|---|---|---|
| A — Défi quotidien chronométré | Un plateau identique pour tous les joueurs chaque jour, temps de résolution comparé sur un classement | Rupture assumée : c'est le seul mode avec pression, en option |
| B — Classement à l'efficacité | Même plateau pour tous, classement par nombre de coups/indices utilisés plutôt que par vitesse | Garde l'esprit "zéro pression" (pas de chrono visible) tout en étant compétitif |
| C — Niveaux "boss" débloqués | Plateaux plus grands/complexes, débloqués après le mode Classique, sans classement | Le plus simple à développer, aucune dépendance serveur/backend |

Recommandation raisonnable pour une v1 : commencer par **l'option C** (aucun
besoin de backend de classement), puis ajouter B ou A plus tard si le jeu
trouve son public.

## 8. Interface et réglages

- **Thèmes clair et sombre**, commutables.
- Interrupteurs indépendants : **son**, **musique**, **vibration**.
- **Fonctionne hors ligne** intégralement (mode Classique et tutoriel — un mode
  Arena à classement demanderait forcément une connexion).

## 9. Décisions de design explicites (ambiguïtés du texte source tranchées ici)

Le texte marketing original est volontairement poétique et laisse plusieurs
points implicites. Voici les choix retenus pour cette spécification — à
ajuster librement, mais il faut un choix ferme avant de coder, sinon un agent
IA "vibe-codé" tranchera différemment à chaque session et la logique dérivera :

1. **Auto-croisement interdit** : un chemin ne peut jamais repasser sur
   lui-même. (Déduit de "reel back" étant présenté comme LE mécanisme de
   correction — s'il était possible de simplement redessiner par-dessus, reel
   back n'aurait pas de raison d'être.)
2. **Pas de diagonales** : uniquement haut/bas/gauche/droite. (Déduit de
   "squares that touch" + convention standard des puzzles de grille de ce type.)
3. **Le chiffre = nombre de pas, pas nombre de cases.** (Déduit de "how far it
   reaches", qui décrit une distance/portée, pas un décompte de cases.)
4. **Longueur minimale recommandée : chiffre ≥ 1** (donc chaque snake occupe au
   moins 2 cases). Un chiffre 0 serait une tête isolée sans intérêt de tracé ;
   à réserver, au mieux, à un tout premier écran d'onboarding si besoin.
5. **Unicité de solution : non garantie par défaut.** Le texte original garantit
   seulement "guaranteed solution" (au moins une), pas l'unicité. Le générateur
   fourni respecte exactement ça. Si tu veux des niveaux à solution unique (plus
   satisfaisant pour un puzzle "logique pure"), voir la note dans le guide
   technique, section génération de niveaux.
