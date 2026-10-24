# Copie finale (FR) — Livrable 4

> Le texte intégral vit dans `index.html` (statique) et `js/products.js`, `js/app.js` (dynamique). Ce document en est le résumé de référence. Tout texte entre `⟦…⟧` dépend d'une confirmation du propriétaire.

## Hero
- Annonce : « Livraison offerte partout au Maroc · Paiement à la livraison »
- Eyebrow : COLLECTION Z'MAN · MAISON SABRA
- H1 : « L'élégance marocaine, dans chaque détail. »
- Sous-titre (desktop) : « Des textures précieuses, des détails dorés et une inspiration marocaine qui donne du caractère à votre style. »
- CTA : **CHOISIR MON SAC Z'MAN** · lien : « Découvrir les détails »
- Ligne de confiance : « Livraison gratuite partout au Maroc · Paiement à la livraison »

## Accroches par coloris
| Coloris | Tagline | Description |
|---|---|---|
| Rouge | Rouge intense, éclat doré. | Velours rouge vibrant en relief sur tissu doré : le rouge s'affirme, l'or le fait respirer. Fermoir doré vintage, chaîne dorée détachable. |
| Vert | Un vert profond, une élégance affirmée. | Velours vert profond en relief sur tissu doré lumineux, motifs géométriques inspirés des arts traditionnels. Chaîne fine dorée détachable. |
| Violet | Une touche de violet, un caractère singulier. | Violet royal intense en velours relief sur tissu doré scintillant, motifs baroques revisités. Fermoir vintage, chaîne dorée détachable. |
| Beige | La douceur des tons naturels. | Velours beige brodé de fils dorés, forme arrondie et généreuse, chaîne dorée légère. |
| Multicolore | L'art de jouer avec les couleurs. | Velours multicolore — rouge, ocre, beige, noir — rehaussé de touches dorées artistiques, comme une peinture abstraite. |

## Sections
- **S4** — « Le détail qui change toute une silhouette. » / « Une tenue raconte une histoire. Un accessoire singulier lui donne sa signature. » + 4 pistes (caftan, robe, tenue coordonnée, look contemporain).
- **S5** — « Trois moments, une signature. » : *Les grandes occasions* « Pour les célébrations qui restent dans les souvenirs. » · *Les soirées et les dîners* « Pour ces soirées où chaque détail compte. » · *Votre propre style* « Parce que l'élégance n'attend pas une invitation. »
- **S6** — « Un esprit marocain. Une expression contemporaine. » (velours en relief/tissu doré, fermoir, chaîne détachable, intérieur doublé, fabrication artisanale du Maroc — faits vérifiés uniquement).
- **S7** — « Tout ce qu'il faut savoir, sans surprise. »
- **S8** — « Votre Z'man. Votre signature. »
- **S9** — « Ce que vous pouvez vérifier. »
- **S10** — « Commander en toute simplicité. » 1 Choisissez · 2 Confirmez (⟦processus réel⟧, par défaut : « Votre commande est transmise à l'équipe Maison Sabra, qui la prend en charge. ») · 3 Recevez (« …et payez à la livraison. » ⟦+ délai⟧)
- **S13** — « Une touche marocaine. Une élégance qui vous ressemble. » / CTA **CHOISIR MON Z'MAN**

## Formulaire
Titre : « Réservez votre pièce unique. » · CTA : **CONFIRMER MA COMMANDE**

**1. Choisissez votre offre** (boutons radio, offre 1 cochée par défaut) :
- « L’Élégance Simple. » — 1 Sac Z’man au choix : 549 MAD (+ Livraison Gratuite).
- « Le Duo Signature » + pastille « Recommandé » — 2 Sacs Z’man au choix. · Avantage : Livraison Gratuite + 10% de réduction automatique (Code : GIFT64 appliqué). · Total estimé : 988 MAD au lieu de 1 098 MAD.

**2. Couleurs** (boutons ronds avec la photo de chaque modèle ; 1 sélecteur pour l'offre 1, 2 sélecteurs indépendants pour l'offre 2, couleurs identiques ou différentes) : Velours Rouge & Doré · Velours Vert Émeraude · Violet Royal en Relief · Beige Lumineux Brodé · Velours Multicolore Bohème.
Erreurs : « Choisissez la couleur de votre sac. » / « Choisissez la couleur de votre 2e sac. »

Libellés : Nom complet · Numéro de téléphone · Ville · Adresse de livraison · (facultatif) Repère, quartier, instructions.
Récapitulatif : Sac(s) choisi(s) · Sous-total et « Réduction 10% (GIFT64 appliqué) » (offre 2) · Livraison « 0 MAD (offerte) » · Total à payer · Paiement « À la livraison (espèces) ».

Erreurs :
- Nom : « Veuillez saisir votre prénom et votre nom. »
- Téléphone : « Veuillez saisir votre numéro de téléphone. » / « Numéro invalide. Exemple : 06 12 34 56 78 ou +212 6 12 34 56 78. »
- Ville : « Veuillez indiquer votre ville. »
- Adresse : « Indiquez une adresse complète (rue, numéro, quartier) pour la livraison. »
- Backend non configuré : « Commande non enregistrée. La connexion de prise de commande n'est pas encore activée sur cette page. Écrivez-nous… »
- Échec réseau : « Connexion impossible. Votre commande n'a pas été enregistrée — vous pouvez réessayer sans risque de doublon. »
Succès (uniquement si `ok:true`) : « Merci, votre commande est enregistrée. » + référence, modèle, quantité, total, paiement.

## FAQ (réponses dans `js/app.js › renderFaq`)
Les 10 questions du brief. Points sensibles :
- **Délais** : sans ⟦`copy.deliveryDelay`⟧, la réponse cite la politique officielle (« expédiées sous 48 h ouvrées ») — **à valider** (voir 03-integration §3).
- **Capacité / longueur de chaîne** : aucune valeur inventée, renvoi vers WhatsApp.
- **Retour** : reprend la politique officielle (3 jours, remboursement après réception).

## Élément de confiance (hero, à droite du prix)
Pastille sur la photo : « ★ MEILLEURE VENTE ». À droite du prix : « ★★★★★ 4,9 » · « (259 clients) » · « 🔥 200+ vendus cette semaine ».
Valeurs dans `ZMAN_CONFIG.trust` (`enabled:false` pour tout masquer). ⚠ Chiffres fournis par le propriétaire : à vérifier ; « vendus cette semaine » est une affirmation datée à tenir à jour.

## Offre exclusive (upsell) — affichée après validation du formulaire avec l'offre 1
Bandeau : « Offre exclusive · se termine dans 05:00 ».
Titre : « Un 2ᵉ sac Z'man à −25 %, rien que pour vous. » · « Choisissez la couleur de votre 2ᵉ sac » (les 4 couleurs non commandées, 549 MAD barré → 411 MAD).
Récapitulatif mis à jour : Sous-total 1 098 MAD · Offre exclusive −25 % : −138 MAD · Livraison 0 MAD (offerte) · **Nouveau total 960 MAD** · Refus : bouton « Non merci, continuer sans cette offre » (plein largeur + rappel dans la barre fixe).
Boutons : « AJOUTER À MA COMMANDE » (« CHOISIR UNE COULEUR » tant qu'aucune couleur n'est choisie) · « Non merci, continuer sans cette offre ».
Fin du compte à rebours : « Cette offre exclusive a expiré. Pas d'inquiétude : votre commande reste enregistrée telle quelle. » puis passage automatique au remerciement.

## Page de remerciement
« Merci [Prénom], votre commande est bien reçue. » · « Notre équipe vous appellera dans les plus brefs délais pour confirmer votre commande au 06 •• •• •• 78. Pensez à garder votre téléphone à portée de main. »
« Comment se passe la livraison ? » : 1 Nous vous appelons pour confirmer · 2 Préparation et expédition (délai réel via `copy.deliveryDelay`, sinon renvoi vers la politique de livraison) · 3 Livraison partout au Maroc · 4 Vous payez à la réception (espèces).
