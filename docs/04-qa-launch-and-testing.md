# QA / lancement (Livrable 7) et plan de tests CRO (Livrable 8)

## A. Ce qui a été testé
| Test | Résultat |
|---|---|
| 8 tests unitaires (`node tests/logic.test.js`) : formats de téléphone (06/07/05, +212, 00212, espaces/tirets), rejets, E.164, totaux (1→3 sacs, frais), quantité, validation, noms arabes | ✅ |
| Navigateur (Chromium, 390 px et 1366 px) : aucun dépassement horizontal, aucune erreur JS | ✅ |
| Sélecteur : swatch → nom, galerie, select du formulaire et récapitulatif synchronisés ; carte couleur → bascule + scroll au formulaire | ✅ |
| Total : 549 → 1 098 MAD (qté 2), livraison 0 | ✅ |
| Formulaire vide → 4 erreurs en français ; champs valides sans endpoint → alerte « Commande non enregistrée », **pas de succès** | ✅ |
| Endpoint simulé : HTTP 500 → échec affiché + bouton réactivé ; 201 `{ok:true}` → confirmation avec référence | ✅ |
| CTA collant : visible au milieu de la page, masqué sur le hero et sur le formulaire | ✅ |
| Captures mobile/desktop relues | ✅ |

## B. Non testé / limites
- Aucun test avec un vrai backend, un vrai Pixel/CAPI, ni sur appareils réels (iOS Safari, Android bas de gamme).
- Images distantes (photos 2–4) : non chargeables dans mon environnement, contenu non vérifié ; polices Google non chargées pendant mes tests (repli serif/sans).
- Lighthouse / Core Web Vitals non mesurés. Pas de test lecteur d'écran (structure ARIA, focus, labels en place).
- Version arabe/Darija non produite (page FR uniquement ; `lang="fr"`).
- `server/order-endpoint.js` : référence non exécutée contre WooCommerce ; limitation de débit et idempotence en mémoire.

## C. Checklist avant d'accepter de vraies commandes
- [ ] Endpoint déployé, `order.endpoint` renseigné, bandeau démo disparu
- [ ] Commande test de bout en bout → apparaît dans l'outil de traitement avec le bon modèle, prix, téléphone au format +212
- [ ] Livraison gratuite alignée avec le checkout et la page /livraison
- [ ] Délai de livraison et processus de confirmation renseignés (ou formulations neutres validées)
- [ ] Politique COD (refus/retour, ouverture du colis) rédigée — aucune promesse non tenue
- [ ] Images 2–4 téléchargées, contrôlées, optimisées ; image OG 1200×630
- [ ] Prix 549 confirmé ; offres cumulables (GIFT64, -10 %) désactivées ou exclues pour éviter les prix incohérents
- [ ] Pixel testé (Events Manager : PageView, ViewContent, InitiateCheckout, Lead) + CAPI avec `event_id` ; EMQ surveillé
- [ ] Purchase serveur branché au statut « livré/confirmé »
- [ ] Consentement/mentions légales (loi 09-08) validés
- [ ] Test réel sur iPhone Safari + Android Chrome + connexion 3G ; Lighthouse mobile ≥ 85
- [ ] Anti-spam (honeypot présent ; ajouter Turnstile/rate-limit serveur si attaques)
- [ ] Texte : relecture par l'équipe (aucune promesse inventée, aucune fausse rareté)

## D. Plan d'expériences CRO
**Règle** : une variable à la fois, un trafic Meta homogène (même campagne/créa), minimum ~100 commandes *confirmées* par variante, ou au moins 2 cycles hebdomadaires complets. Juger sur : *commandes livrées / sessions* (KPI), puis soumission/session, taux de début de formulaire, abandon, taux de confirmation, marge après retours. Ne pas conclure sur quelques commandes.

| # | Hypothèse | Variante | Mesure primaire | Garde-fous |
|---|---|---|---|---|
| 1 | Première image + hiérarchie : une photo plus claire/proche augmente l'intérêt | A : photo de face actuelle · B : gros plan velours en 1re image | clics CTA hero, début de formulaire | taux de confirmation |
| 2 | Titre émotionnel vs concret | A : « L'élégance marocaine, dans chaque détail » · B : « Le sac en velours doré qui signe votre tenue » | scroll 50 %, CTA | — |
| 3 | Présentation du prix/offre | A : 549 MAD seul · B : 549 MAD + prix de référence **si validé légalement** | soumission/session | marge, confiance (retours) |
| 4 | Sélecteur : coloris préselectionné vs choix à faire | A : rouge présélectionné · B : modèle de l'annonce (paramètre `?model=`) | soumission/session | diversité des ventes |
| 5 | Réassurance COD : emplacement/formulation | A : sous le CTA · B : + bloc « Comment ça marche » avant le formulaire | début de formulaire, abandon | confirmations |
| 6 | Longueur du formulaire | A : 4 champs · B : 3 champs (adresse fusionnée avec ville) · C : WhatsApp seul | soumission, **taux de confirmation**, adresses valides | livrées/soumises |

Ordre recommandé : 4 (gratuit, vient de la correspondance annonce→page) → 1 → 5 → 2 → 6 → 3. Les créas Meta pointant vers `?model=rouge|vert|violet|beige|multicolore` (déjà supporté) permettent d'aligner l'annonce et la page.

**Suivi des commandes** : tableau par variante (sessions, démarrages, soumises, confirmées, livrées, retournées, CPA livré, marge). Une variante qui augmente les soumissions mais baisse les livraisons n'est pas gagnante.

## Ajouts : upsell, remerciement, confiance (vérifiés par script Playwright à 390 px)
- [x] Offre Duo → remerciement direct (pas d'upsell) ; offre 1 + couleur + formulaire accepté → upsell.
- [x] Pour chacune des 5 couleurs commandées, l'upsell propose les 4 autres (jamais la couleur commandée).
- [x] Choix d'une 2e couleur → sous-total 1 098, remise −138, total 960 MAD ; mêmes montants au remerciement et dans la 2e requête.
- [x] Sans couleur choisie : message d'erreur, pas de navigation.
- [x] Compte à rebours 05:00 → 00:00 ; l'offre disparaît, passage auto au remerciement ; rechargement : le compteur ne se remet pas à zéro.
- [x] Accès direct à `#/merci` ou `#/offre-exclusive` sans commande → page principale.
- [x] Réponse serveur 410 → offre fermée ; erreur réseau → message, commande initiale conservée.
- [x] Élément de confiance dans la rangée du prix + pastille sur la photo ; aucun débordement horizontal (360/390/1280).
- [ ] À faire côté propriétaire : test sur vrais téléphones (clavier, barre d'action collante), endpoint réel, Pixel (événements personnalisés).
