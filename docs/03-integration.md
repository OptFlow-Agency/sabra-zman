# Intégration — Livrable 6

## 0. État actuel : DÉMONSTRATION
`js/config.js › order.endpoint` est vide. Tant qu'il l'est, la page affiche un bandeau « MODE DÉMONSTRATION », valide le formulaire, **refuse d'afficher un succès** et propose WhatsApp/téléphone. Aucune commande n'est enregistrée.

## 1. Brancher les commandes
1. Déployer `server/order-endpoint.js` (Node 18+, 0 dépendance) sur votre serveur, ou reprendre sa logique dans votre stack (ex. plugin WordPress/route API).
2. Implémenter `saveOrder(order)` → créer la commande et retourner `{ orderRef }`. Pour WooCommerce : `POST {WOO_URL}/wp-json/wc/v3/orders` avec `payment_method:"cod"`, `status:"on-hold"`, ligne produit = `wooId`, meta `clientOrderId`. **Clés Woo uniquement côté serveur.**
3. Variables d'environnement : `ALLOWED_ORIGIN` (domaine de la page), `PORT`, `WOO_*`, `META_PIXEL_ID`, `META_CAPI_TOKEN`.
4. Renseigner `order.endpoint` dans `config.js` (HTTPS, CORS limité à votre domaine).

**Contrat de l'API**
- Requête `POST` JSON : `clientOrderId`, `eventId`, `offer{id,discountPercent,code}`, `items[{id,wooProductId,name}]` (1 élément pour « simple », 2 pour « duo »), `quantity`, `expectedTotal`, `currency`, `customer{fullName,phone(+212…),city,address,notes}`, `payment:"cod"`, `attribution{fbp,fbc,pageUrl,search}`. En-tête `Idempotency-Key`.
- Succès : HTTP 2xx **et** `{ "ok": true, "orderRef": "…" }`. Toute autre réponse = échec affiché, rien n'est « confirmé ».
- Erreur de champ : 422 `{ ok:false, error:{ message, fields:{phone:"…"} } }`.
- Le serveur **recalcule le prix** (ne jamais croire `expectedTotal`), applique idempotence (pas de doublon si re-soumission), limitation de débit (8/min/IP, à renforcer) et refuse les offres/modèles inconnus ou un nombre de sacs qui ne correspond pas à l'offre.
- **Offre Duo / code GIFT64** : l'affichage « 988 MAD au lieu de 1 098 MAD » est calculé côté navigateur à partir de `ZMAN_CONFIG.offers`, mais seul le serveur fait foi (`OFFERS` dans `server/order-endpoint.js`, à garder identique). À vérifier côté boutique : le coupon GIFT64 existe-t-il, est-il cumulable avec le prix de 549 MAD, et le Duo respecte-t-il son seuil (le site annonce « 15 % dès 800 dhs », alors que le Duo affiche −10 %) ? Le total envoyé à la boutique doit être 988 MAD, livraison offerte.

## 2. Données produit
`js/products.js` = source unique. Changer un prix : modifier `price` (et `PRODUCTS` côté serveur). `showReferencePrice` reste `false` tant que vous n'avez pas confirmé que les prix 890–990 ont réellement été pratiqués.

## 3. Livraison — à trancher AVANT publication
| Source | Dit |
|---|---|
| Brief campagne | gratuite partout au Maroc |
| Site officiel (/livraison) | gratuite dès 1 000 MAD, sinon frais selon la ville ; expédition 48 h ouvrées après « validation du paiement » |
| Checkout WooCommerce | à vérifier : doit afficher 0 MAD pour ces produits |

Actions : (a) créer dans WooCommerce une règle « livraison gratuite » pour ces 5 produits/cette offre ; (b) mettre à jour la page « Livraison » du site ou préciser « offre Z'man » ; (c) si la gratuité n'est pas confirmée, `shipping.freeNationwide:false` — la page bascule automatiquement vers « frais selon la ville ».
La FAQ « délais » cite la politique officielle (48 h ouvrées pour l'expédition). Pour du COD, « après validation du paiement » est ambigu → renseigner `copy.deliveryDelay` avec le vrai délai d'arrivée, sinon retirer la phrase.

## 4. Confirmation de commande
`copy.confirmationStep` et `copy.nextSteps` : décrire le vrai processus (appel, WhatsApp, délai de rappel). Ne l'activer que si l'équipe peut le tenir. Recommandé : statut Woo « en attente » → confirmation téléphonique → « en cours ».

## 5. Analytics / Meta
- `analytics.pixelId` : ID du Pixel. Aucun jeton côté navigateur.
- Événements navigateur : `PageView`, `ViewContent` (changement de modèle inclus), `SelectVariant` (custom), `InitiateCheckout` (1re interaction avec le formulaire), `CtaClick` (custom), **`Lead`** = commande acceptée par le backend (avec `eventID`).
- **`Purchase`** part désormais de la page **à l'arrivée sur la page de remerciement** (demande du propriétaire), une fois par commande, avec `eventID = purchase-<clientOrderId>` ; le serveur (`Code.gs`) envoie le même `event_id` en CAPI. Attention : en paiement à la livraison, cela compte les commandes *passées*, pas *confirmées* ; le suivi confirmé/livré se fait dans le Sheet (voir `docs/06-google-sheets-crm.md`).
- Déduplication Lead : le navigateur envoie `eventID`, le même `eventId` est transmis au serveur (`sendCapi`).
- Aucun nom/téléphone/adresse dans les URL ni dans les payloads navigateur ; la CAPI envoie téléphone et ville **hachés SHA-256**. Vérifier la conformité loi 09-08 / consentement cookies si requis.
- Paramètres UTM : conservés dans `attribution.search`.

## 6. Images
Les photos 2–4 de chaque modèle sont chargées depuis maisonsabra.ma (hotlink). À faire : télécharger les 12 fichiers, **les ouvrir un par un** (vérifier gros plan/intérieur/porté, supprimer les doublons), les convertir en WebP (~1000 px, <120 Ko), les placer dans `assets/` et mettre à jour `products.js`. Ajouter ensuite des alt précis (« intérieur doublé », « chaîne détachée »…). L'image OG pointe vers la photo rouge officielle : à remplacer par une image 1200×630.

## 7. SEO / hébergement
- `canonical` → page collection officielle (évite un doublon). Pour une page indexable propre : mettre son URL dans `seo.canonical` et retirer le `noindex` éventuel.
- JSON-LD `Product/Offer` (nom, prix, image, couleur, matière) ; **sans** note, avis, stock ni livraison. À valider dans le test des résultats enrichis.
- Servir en HTTPS, compression, cache long sur `assets/`.
- Polices Google chargées en CDN : à auto-héberger si vous voulez zéro dépendance.

## 8. Éléments à fournir par le propriétaire
Endpoint/credentials Woo ou autre ; ID Pixel + jeton CAPI ; règle de livraison ; délai réel ; processus de confirmation ; politique COD (refus, essai) ; images vérifiées ; accord pour d'éventuels témoignages ; confirmation des prix de référence.

## 5. Upsell post-commande (2e sac −25 %, 5 minutes) et page de remerciement

**Déclenchement (front)** : uniquement si l'offre `triggerOfferId` (« simple ») est choisie, une couleur est choisie et le formulaire est accepté par le serveur. Offre « Duo » → remerciement directement.
**Pages** : vues de la même page, routées par `#/offre-exclusive` et `#/merci` (fonctionne en hébergement statique comme en aperçu). L'accès direct sans commande renvoie à la page principale ; après expiration ou refus, l'offre ne se rouvre pas (bouton Retour compris).
**Compte à rebours réel** : l'échéance (`Date.now() + durationSeconds`) est conservée en `sessionStorage` : un rechargement ne remet pas le compteur à zéro. À 00:00 l'offre disparaît (message de fin, puis remerciement après 5 s).
**Couleurs proposées** : toutes sauf celle déjà commandée (`ZmanLogic.upsellChoices`).
**Prix** : 1er sac plein tarif + 2e sac à −25 % (arrondi inférieur : 411,75 → 411) = 549 + 411 = **960 MAD** (`ZmanLogic.computeUpsell`).

**Contrat API — 2e requête `POST` (même endpoint)**
- Corps : `type:"upsell"`, `parentClientOrderId`, `orderRef`, `clientOrderId` (= parent + `:upsell`), `eventId`, `upsell{discountPercent, item{id,wooProductId,name}}`, `expectedTotal`, `currency`. En-tête `Idempotency-Key` = `clientOrderId`.
- Succès : 2xx **et** `{ ok:true, orderRef, total }`. Le front ne passe au remerciement avec le 2e sac qu'à cette condition.
- Refus : `410 {error:{code:"UPSELL_EXPIRED"}}` (fenêtre dépassée → le front ferme l'offre), `409` (offre indisponible / déjà utilisée), `422` (même couleur que la commande ou modèle inconnu), `404` (commande inconnue), `501` tant que `saveUpsell()` n'est pas branché.
- Le serveur **recalcule** tout et ignore `expectedTotal`. Il fait foi sur l'échéance : `UPSELL` dans `server/order-endpoint.js` (même durée + 15 s de tolérance). Branchez `saveUpsell()` : ajouter l'article remisé à la commande existante et mettre le total à 960 MAD.

**Mode démonstration** : sans `order.endpoint`, le formulaire déroule l'upsell et le remerciement en SIMULATION (bandeau jaune « MODE DÉMONSTRATION — cette commande n'a pas été enregistrée »), sans requête réseau ni événement de suivi. Dès que l'endpoint est renseigné, le parcours est réel.

**Suivi** (sans donnée personnelle, événements personnalisés) : `ViewUpsell`, `UpsellAccepted`, `UpsellDeclined`, `UpsellExpired`, `ViewThankYou`. `Lead` part à l'acceptation de la commande 1 ; `Purchase` part à l'arrivée sur la page de remerciement (valeur finale, upsell inclus).

**⚠ Cohérence tarifaire à arbitrer** : Duo = 988 MAD pour 2 sacs, alors que commande simple + upsell = 960 MAD pour 2 sacs. Une cliente qui compare verra que l'upsell est **28 MAD moins cher** que le Duo (en vitrine, le Duo n'est donc plus le meilleur prix). À arbitrer (ex. Duo à −15 % = 933 MAD).

**Élément de confiance** : `ZMAN_CONFIG.trust` (note, nombre de clients, « vendus cette semaine », pastille). Pas de données structurées de type `aggregateRating` : volontairement non ajoutées au JSON-LD.
