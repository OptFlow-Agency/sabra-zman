# Z'man · Maison Sabra — Recherche, stratégie, architecture
*(Livrables 1, 2 et 3 · sources consultées le 15/10/2026)*

## 1. Résumé de la recherche

### Produits vérifiés (pages produit officielles maisonsabra.ma)
| Modèle | Prix actuel | Prix de référence affiché | ID Woo* | SKU |
|---|---|---|---|---|
| Velours Rouge & Tissu Doré | 549 MAD | 990 | 1345 | sac002 |
| Velours Vert & Tissu Doré | 549 MAD | 945 | 1358 | — |
| Violet Royal & Doré en Velours Relief | 549 MAD | 890 | 1313 | sac001 |
| Velours Beige Brodé Doré | 549 MAD | 949 | 1353 | — |
| Tissu Velours Multicolore & Dorures | 549 MAD | 890 | 1360 | — |

\*Lus dans les liens « add-to-cart » de la page collection.

**Identique sur les 5 fiches** : L 28 × H 20 × P 7 cm, poids estimé 350 g, fermoir métallique doré, chaîne dorée détachable, fabrication artisanale – Maroc.
**Varie** : matières/couleurs ; doublure (« Tissu intérieur » pour le rouge ; « noir ou assorti » pour vert, violet, beige ; « noir » pour le multicolore) ; description du port de la chaîne (« fine », « légère »).

### Photographies
- 5 photos fournies (une par modèle) → utilisées en premier plan de chaque galerie, en local (`assets/`).
- Chaque fiche officielle expose 3 autres vues. Elles sont référencées par URL officielle dans `products.js` mais **je n'ai pas pu les ouvrir** (l'outil d'analyse d'image n'a pas accepté ces fichiers et le réseau du bac à sable bloque le site). Leur contenu (gros plan, intérieur, porté) n'est donc **pas vérifié**. → À télécharger et contrôler (voir 03-integration §6).
- **Aucune photo portée par un mannequin n'est confirmée** : les sections « moments » utilisent des photos produit, sans prétendre montrer une tenue.

### Éléments de réassurance officiels
- Livraison : partout au Maroc ; **gratuite dès 1 000 MAD** ; en dessous, frais selon la ville ; expédition « sous 48 h ouvrées après validation du paiement ».
- Retours : signalement sous 3 jours après réception ; remboursement après validation et réception du retour.
- Annulation : sous 12 h si non expédiée.
- Contact publié : 0697-180195 (téléphone/WhatsApp), contact@maisonsabra.com, Instagram @maison.sabra.

### Avis clients
- Fiches Z'man : **0 avis**.
- Accueil : 3 témoignages (Instagram « eddahabitouria » en arabe, Salma R., Karima). Aucun ne nomme un modèle Z'man ; ils parlent de la marque. **Non utilisés** dans cette version (leur réutilisation sur une page campagne demande l'accord des clientes ; ajout possible via `config.testimonials`). La section « Ce que vous pouvez vérifier » les remplace par des faits produit.

### Informations manquantes / à trancher
1. **Livraison gratuite partout** (brief) ≠ site officiel (gratuite dès 1 000 MAD). À réconcilier avant publication.
2. **Prix de référence** 890–990 MAD : légitimité non vérifiable → masqués (`showReferencePrice:false`). Le bandeau du site mentionne aussi « 15 % dès 800 dhs, code GIFT64 » et « -10 % sur tous les produits » : ces offres peuvent contredire le prix 549 ; la page n'en parle pas.
3. Délai de livraison réel, processus de confirmation (appel/WhatsApp ?), politique COD (refus à la livraison, ouverture du colis).
4. Longueur de la chaîne, capacité interne réelle (non publiées → pas de promesse « tient un téléphone »).
5. Stocks : visibles sur le site (3 à 5 unités) mais **volontairement non repris** (fausse rareté / données changeantes).
6. Pas de page « Aide (FAQ) » lue : à relire pour aligner les réponses.

## 2. Stratégie de conversion

**Positionnement.** « L'élégance marocaine, dans chaque détail » : pièce de caractère (velours en relief + or), pas seulement accessoire de mariage. Aucun terme « investissement », « cuir », « héritage » ni superlatif.

**Offre.** 549 MAD · livraison gratuite · paiement à la livraison · 5 modèles au même prix (sélection sans quitter la page).

**Trois profils, un seul récit** (intégrés dans la hiérarchie, pas en sections séparées) :
- *Occasion Elegance* → hero photo plein cadre, section « finishing touch », moments « grandes occasions ».
- *Style Curator* → taglines par coloris, section matières, moments « votre propre style ».
- *Versatile Shopper* → prix + COD sous le CTA, fiche technique, FAQ, formulaire court.

**Objections traitées**
| Objection | Réponse sur la page |
|---|---|
| « Est-ce vraiment du velours/artisanal ? » | gros plans, fiche matières, « fabrication artisanale – Maroc » |
| « Quelle taille ? » | dimensions dans le tableau + FAQ ; pas de promesse de capacité |
| « Et si je ne reçois pas ? / pas de paiement en ligne » | COD répété 4 fois, 0 compte, 0 paiement avance |
| « Quel coloris avec ma tenue ? » | 5 swatches + cartes, changement instantané |
| « Frais cachés ? » | récapitulatif : prix, livraison 0 MAD, total |
| « Retour ? » | lien vers politique officielle (3 jours), pas d'invention |

**Flux** : annonce Meta → hero (photo, prix, coloris, CTA) → scroll (preuve/émotion) → CTA collant → formulaire 4 champs + récapitulatif → confirmation **seulement** après réponse `ok:true` du serveur → confirmation humaine/livraison → événement serveur Purchase.

## 3. Architecture de la page

| # | Section | Rôle |
|---|---|---|
| 1 | Barre d'annonce | livraison + COD, sans compte à rebours |
| 2 | En-tête minimal | logo, libellé collection, « Aide » → FAQ ; pas de menu qui fuit |
| 3 | Hero + achat | photo principale → sélecteur de modèle → photos du modèle (sur mobile : visibles dès l'arrivée), puis titre, prix, CTA |
| 4 | Détail qui change la silhouette | désir, styling sans surpromesse |
| 5 | Trois moments | élargir au-delà du mariage |
| 6 | Design & matières | crédibilité par les faits vérifiés |
| 7 | Détails produit | lève les doutes (dimensions, poids, chaîne, doublure) |
| 8 | Choisir sa couleur | comparer et sélectionner |
| 9 | *(supprimée)* | l'ancienne section « Ce que vous pouvez vérifier » a été retirée à la demande du client ; les faits produit restent dans la fiche technique |
| 10 | Les sacs, en mouvement | 2 vidéos clientes + 1 déballage (lecture au toucher) |
| 11 | Formulaire COD | conversion |
| 12 | FAQ | objections résiduelles |
| 13 | Closing | dernier CTA vers le formulaire |
| — | CTA collant (mobile) | masqué sur le hero et sur le formulaire |
