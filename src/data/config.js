export const config = {
  /* ------------------------------------------------------------------ *
   * 1. COMMANDES — SANS LES VARIABLES SUPABASE, AUCUNE COMMANDE N'EST ENREGISTRÉE
   * ------------------------------------------------------------------ */
  order: {
    // Les commandes partent vers Supabase (fonction `place_order`, voir src/lib/supabase.js) avec
    // PUBLIC_SUPABASE_URL et PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env). Sans ces variables : MODE DÉMONSTRATION,
    // le formulaire valide les champs mais n'enregistre rien.
    timeoutMs: 15000,
  },

  /* ------------------------------------------------------------------ *
   * 1 bis. OFFRES (augmentation du panier moyen)
   *   qty            : nombre de sacs (un sélecteur de couleur par sac)
   *   discountPercent: réduction automatique appliquée sur le sous-total
   *   code           : code promo envoyé à `place_order` — il DOIT exister dans la table des codes promo
   *                    (admin → Codes promo, % identique, valable sur les produits zman-*) sinon la commande est refusée.
   *                    Le montant affiché côté navigateur n'est qu'un affichage : le serveur recalcule.
   *   Les prix viennent de js/products.js ; la livraison de `shipping` ci-dessous.
   * ------------------------------------------------------------------ */
  offers: [
    { id: "simple", qty: 1, title: "L’Élégance Simple.", discountPercent: 0, code: "", badge: "", defaultSelected: true },
    { id: "duo", qty: 2, title: "Le Duo Signature", discountPercent: 10, code: "BAG23", badge: "Recommandé" },
  ],

  /* ------------------------------------------------------------------ *
   * 1 ter. ÉLÉMENT DE CONFIANCE (note + ventes + pastille « Meilleure vente »)
   *   ⚠ Ces chiffres sont affichés tels quels aux clientes : ils doivent être réels et vérifiables
   *   (exports de commandes / avis). « soldThisWeek » est une affirmation datée : à mettre à jour
   *   chaque semaine ou à retirer. enabled:false => aucun de ces éléments n'est affiché.
   * ------------------------------------------------------------------ */
  trust: {
    enabled: true,
    badge: "Meilleure vente",
    rating: 4.9,
    count: 259,
    soldThisWeek: "200+",
  },

  /* ------------------------------------------------------------------ *
   * 1 quater. UPSELL après commande (2e sac à prix réduit, durée limitée)
   *   Déclenché UNIQUEMENT si la cliente a choisi l'offre `triggerOfferId` et validé le formulaire.
   *   Le compte à rebours est réel : l'échéance est mémorisée (un rechargement ne le remet pas à zéro)
   *   `code` : code promo Supabase qui donne la réduction de l'upsell. Le code doit avoir `second_item_only = true`
   *   (voir apply_promo) pour ne réduire que le 2e sac.
   * ------------------------------------------------------------------ */
  upsell: {
    enabled: true,
    triggerOfferId: "simple",
    discountPercent: 25, // 2e sac : 549 − 25 % = 411,75 → 411 MAD (arrondi inférieur) ; 1er + 2e sac = 960 MAD
    durationSeconds: 300, // 5 minutes
    orderPercent: 20, // estimation affichée si la base ne confirme pas (encore) le code ci-dessous
    code: "GIFT64", // code promo Supabase « second_item_only » : ne réduit que le 2e sac (dernier article envoyé) ; % et montant lus en base
  },

  /* ------------------------------------------------------------------ *
   * 2. LIVRAISON — À RÉCONCILIER AVEC LE CHECKOUT DU SITE AVANT PUBLICATION
   *    Le site officiel indique : livraison gratuite dès 1 000 MAD, frais selon la ville en dessous.
   *    Cette page applique la politique commerciale demandée : gratuite partout.
   * ------------------------------------------------------------------ */
  shipping: {
    freeNationwide: true, // false => la page n'affiche plus "gratuite partout" (frais selon la ville)
    cost: 0,
  },

  /* ------------------------------------------------------------------ *
   * 3. PRIX
   * ------------------------------------------------------------------ */
  currency: "MAD",
  // Prix barré : affiché seulement si vous confirmez que ces prix de référence ont réellement été pratiqués.
  showReferencePrice: false,

  /* ------------------------------------------------------------------ *
   * 4. CONTACT (canaux publiés sur la page « Livraison » du site officiel)
   * ------------------------------------------------------------------ */
  contact: {
    phoneDisplay: "0697 18 01 95",
    phoneTel: "+212697180195",
    whatsappNumber: "212697180195", // wa.me, sans "+" — même numéro publié comme "Téléphone / WhatsApp"
    email: "contact@maisonsabra.com",
    instagram: "https://www.instagram.com/maison.sabra/",
  },

  /* ------------------------------------------------------------------ *
   * 5. LIENS DE POLITIQUES OFFICIELLES
   * ------------------------------------------------------------------ */
  links: {
    delivery: "https://maisonsabra.ma/livraison-maison-sabra/",
    returns: "https://maisonsabra.ma/retours-reclamations-maison-sabra/",
    policies: "https://maisonsabra.ma/nos-politiques-maison-sabra/",
    privacy: "https://maisonsabra.ma/privacy-policy/",
    collection: "https://maisonsabra.ma/product-category/collection-zman/",
    home: "https://maisonsabra.ma/",
  },

  /* ------------------------------------------------------------------ *
   * 6. TEXTES OPÉRATIONNELS À CONFIRMER
   *    "" => la page utilise une formulation neutre qui n'engage à rien.
   * ------------------------------------------------------------------ */
  copy: {
    // Étape 2 « Confirmez » : décrivez le vrai processus (ex. appel / WhatsApp) UNIQUEMENT s'il est assuré.
    confirmationStep: "",
    // Étape 3 + page de succès : délai de livraison réel (ex. « sous 2 à 4 jours ouvrés selon la ville »).
    deliveryDelay: "",
    // Message affiché après succès (« ce qui se passe ensuite »).
    nextSteps: "",
  },

  /* ------------------------------------------------------------------ *
   * 7. AVIS CLIENTS VÉRIFIÉS (laisser vide tant qu'aucun avis authentique et autorisé n'existe)
   *    Format : { author: "Prénom N.", text: "…", source: "Instagram|Site", productId: "rouge" (optionnel) }
   * ------------------------------------------------------------------ */
  testimonials: [],

  /* ------------------------------------------------------------------ *
   * 8. ANALYTICS / ATTRIBUTION
   * ------------------------------------------------------------------ */
  analytics: {
    pixelId: "1996064601208190", // Pixel Meta Maison Sabra (identifiant public). Aucun jeton d'accès ici — jamais côté navigateur.
    debug: false,
  },

  /* ------------------------------------------------------------------ *
   * 9. SEO
   * ------------------------------------------------------------------ */
  seo: {
    // Par défaut : canonical vers la page collection officielle pour éviter un doublon de contenu.
    // Si cette page devient une page indexable à part entière, remplacez par sa propre URL publique.
    canonical: "https://maisonsabra.ma/product-category/collection-zman/",
  },
};
