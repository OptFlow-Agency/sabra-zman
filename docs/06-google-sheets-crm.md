# 06 · Capture des commandes (Google Sheets), suivi de confirmation, Meta Pixel / CAPI, WhatsApp

## Décision : Google Sheets, pas de CRM sur mesure
Un CRM maison (base de données, serveur, authentification, interface) n'est **pas** nettement plus adapté ici : la page est un site statique sans backend, et le besoin immédiat (recevoir chaque commande, appeler, suivre le statut, mesurer le taux de confirmation) tient dans un Sheet. Un Google Sheet + Apps Script se déploie en 5 minutes, sans serveur ni coût. Un CRM ne se justifie que plus tard (plusieurs agents en parallèle, relances automatisées complexes, volumes élevés) ; la logique du formulaire n'aurait alors pas à changer : seule l'URL `order.endpoint` changerait.

## Ce qui est livré (prêt, testé avec un faux Sheet)
- `integrations/google-sheets/Code.gs` : application Web Apps Script.
  - Onglet **Commandes** : date, réf (`ZM-AAMMJJ-0001`), ID, **Statut** (liste : Nouvelle · Confirmée · Injoignable · À rappeler · Annulée · Livrée), nom, téléphone (+212…), ville, adresse, notes, offre, sac 1, sac 2, sous-total, remise, livraison, total, upsell, « page merci vue », « WhatsApp envoyé », notes équipe, URL source, fbp.
  - Onglet **Suivi** : commandes reçues, nombre par statut, **taux de confirmation** (Confirmée + Livrée) / reçues, taux sur commandes traitées, chiffre d'affaires confirmé.
  - La commande, l'ajout du 2e sac (upsell) et l'arrivée sur la page de remerciement mettent à jour **la même ligne**.
  - Prix et remises **recalculés** dans le script (Duo −10 % = 988 MAD ; upsell −25 % = 549 + 411 = 960 MAD, fenêtre 5 min + 15 s) ; pas de doublon si la cliente renvoie (clé `clientOrderId`) ; cellules neutralisées contre l'injection de formules.

## Mise en place (propriétaire)
1. Nouveau Google Sheet → Extensions → Apps Script → coller `Code.gs` → exécuter `setup()` (autoriser).
2. Déployer → Application Web → Exécuter en tant que : **Moi** · Accès : **Tout le monde**. Copier l'URL `…/exec`.
3. Dans `js/config.js` : `order.endpoint = "<URL>"` (`simpleRequest: true` est déjà réglé). Le bandeau « Mode démonstration » disparaît alors et les commandes sont réellement enregistrées.
4. Faire une commande test, vérifier la ligne dans le Sheet, puis la supprimer.
5. Garder les prix/offres de `Code.gs` identiques à `js/products.js` et `js/config.js` (comme `server/order-endpoint.js`).

## Meta Pixel `1996064601208190`
| Moment | Événement | Détail |
|---|---|---|
| Arrivée sur la page | `PageView` + **`ViewContent`** | une fois par arrivée (le changement de coloris n'émet plus de ViewContent, seulement `SelectVariant`) |
| Formulaire accepté | `Lead` | uniquement après confirmation explicite du backend ; `eventID` partagé avec le serveur |
| **Page de remerciement atteinte** | **`Purchase`** | une fois par commande ; valeur = total final (upsell inclus) en MAD ; `content_ids`, `num_items` ; **aucune donnée personnelle** ; `eventID = purchase-<clientOrderId>` |
Aucun `Lead`/`Purchase` n'est émis en mode démonstration (sans endpoint). Le Purchase navigateur et le Purchase serveur partagent le même `event_id` : Meta les déduplique.
À noter : `Purchase` marque la commande **passée** (paiement à la livraison), pas une commande confirmée ou livrée ; le taux de confirmation se lit dans le Sheet.

## [BLOQUÉ] — éléments à fournir par le propriétaire
- **Google Sheets** : créer le Sheet et déployer le script (impossible depuis cet environnement) → URL `…/exec`.
- **Meta Conversions API** : jeton d'accès du Pixel (Gestionnaire d'événements → Paramètres → Générer un jeton) → propriété de script `META_CAPI_TOKEN`. Sans lui, seul le Pixel navigateur fonctionne.
- **WhatsApp automatique** : compte WhatsApp Business Cloud API, numéro vérifié, **modèle de message approuvé par Meta** (2 variables : prénom, réf.) → propriétés `WA_TOKEN`, `WA_PHONE_ID`, `WA_TEMPLATE`. Sans elles, aucun message n'est envoyé (la colonne « WhatsApp envoyé » reste vide).
- Vérifier que collecter nom, téléphone et adresse dans un Sheet est couvert par votre politique de confidentialité (loi 09-08) et limiter l'accès au Sheet aux personnes qui appellent.

## Meta Conversions API (Supabase Edge Function)

Le site envoie les événements standard (`PageView`, `ViewContent`, `InitiateCheckout`, `Lead`, `Purchase`) à la fonction `supabase/functions/meta-capi`, avec le **même `event_id`** que le Pixel (déduplication). Le jeton reste dans les secrets Supabase ; le navigateur n'envoie que des empreintes SHA-256 (téléphone, prénom, nom, ville) + `fbp`/`fbc`. IP et user-agent sont ajoutés par la fonction.

```bash
supabase secrets set META_CAPI_TOKEN=<jeton> --project-ref <ref>
supabase secrets set META_TEST_EVENT_CODE=TEST12345 --project-ref <ref>   # temporaire : onglet « Tester les événements »
supabase secrets set ALLOWED_ORIGINS=https://votre-domaine --project-ref <ref>   # recommandé
supabase functions deploy meta-capi --no-verify-jwt --project-ref <ref>
```

Vérifier dans Events Manager : chaque événement apparaît « Navigateur + Serveur » (dédupliqué). Retirer `META_TEST_EVENT_CODE` avant le lancement.
