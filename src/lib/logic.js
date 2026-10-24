export function normalizePhone(raw) {
  var s = String(raw == null ? "" : raw).replace(/[\s.\-() ‎‏]/g, "");
  var rest = null;
  if (s.indexOf("+212") === 0) rest = s.slice(4);
  else if (s.indexOf("00212") === 0) rest = s.slice(5);
  else if (/^212\d{9}$/.test(s)) rest = s.slice(3);
  if (rest !== null) return rest.charAt(0) === "0" ? rest : "0" + rest;
  return s;
}

/** Mobiles (06/07) et fixes (05) marocains : 10 chiffres. */
export function isValidMoroccanPhone(raw) {
  return /^0[5-7]\d{8}$/.test(normalizePhone(raw));
}

export function toE164(raw) {
  var n = normalizePhone(raw);
  return /^0[5-7]\d{8}$/.test(n) ? "+212" + n.slice(1) : null;
}

/** "0612345678" → "06 12 34 56 78" (affichage) */
export function formatPhoneDisplay(raw) {
  var n = normalizePhone(raw);
  return /^\d{10}$/.test(n) ? n.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : String(raw || "");
}

export function formatMAD(amount, currency) {
  var n = Number(amount) || 0;
  var s = n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }).replace(/ | /g, " ");
  return s + " " + (currency || "MAD");
}

export function clampQty(q, max) {
  var n = parseInt(q, 10);
  if (!isFinite(n) || n < 1) return 1;
  return Math.min(n, max || 3);
}

/** Total = prix unitaire × quantité + frais de livraison (0 si gratuit). Aucun autre frais. */
export function computeTotal(unitPrice, qty, shippingCost) {
  var q = clampQty(qty, 99);
  var subtotal = unitPrice * q;
  var shipping = Number(shippingCost) || 0;
  return { unitPrice: unitPrice, quantity: q, subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
}

/**
 * Total d'une offre : somme des prix des sacs choisis, moins la réduction en %, plus la livraison.
 * Arrondi au dirham sur le total remise (1 098 × 0,90 = 988,2 → 988 MAD) ; la remise = sous-total − total remisé.
 * prices : tableau des prix unitaires (un par sac) — jamais un prix saisi par le client.
 */
export function computeOrder(prices, discountPercent, shippingCost) {
  var list = (prices || []).map(function (p) { return Number(p) || 0; });
  var subtotal = list.reduce(function (a, b) { return a + b; }, 0);
  var pct = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
  var discounted = Math.round(subtotal * (100 - pct) / 100);
  var shipping = Number(shippingCost) || 0;
  return { quantity: list.length, subtotal: subtotal, discountPercent: pct, discount: subtotal - discounted, shipping: shipping, total: discounted + shipping };
}

/**
 * Upsell : le 1er sac garde son prix, le 2e reçoit `pct` % de réduction (arrondi au dirham).
 * 549 + 549 × 0,75 = 549 + 411,75 → 549 + 411 = 960 MAD (arrondi INFÉRIEUR du 2e sac, en faveur de la cliente). Le serveur recalcule avec la même règle.
 */
export function computeUpsell(firstPrice, secondPrice, pct, shippingCost) {
  var first = Number(firstPrice) || 0, second = Number(secondPrice) || 0;
  var p = Math.min(Math.max(Number(pct) || 0, 0), 100);
  var secondNet = Math.floor(second * (100 - p) / 100);
  var shipping = Number(shippingCost) || 0;
  return { firstPrice: first, secondPrice: second, secondNet: secondNet, discountPercent: p, discount: second - secondNet,
    subtotal: first + second, shipping: shipping, total: first + secondNet + shipping };
}

/** Couleurs proposées en upsell : toutes SAUF celle déjà commandée (jamais de doublon de la commande principale). */
export function upsellChoices(allIds, orderedId) {
  return (allIds || []).filter(function (id) { return id !== orderedId; });
}

/** Secondes restantes avant l'échéance (jamais négatif). */
export function secondsLeft(deadlineMs, nowMs) {
  return Math.max(0, Math.ceil(((Number(deadlineMs) || 0) - (nowMs == null ? Date.now() : nowMs)) / 1000));
}

/** 299 → "04:59" */
export function formatCountdown(sec) {
  var s = Math.max(0, Math.floor(sec)), m = Math.floor(s / 60), r = s % 60;
  return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
}

export const MSG = {
  name: "Veuillez saisir votre prénom et votre nom.",
  phoneRequired: "Veuillez saisir votre numéro de téléphone.",
  phoneInvalid: "Numéro invalide. Exemple : 06 12 34 56 78 ou +212 6 12 34 56 78.",
  city: "Veuillez indiquer votre ville.",
  address: "Indiquez une adresse complète (rue, numéro, quartier) pour la livraison.",
  model: "Veuillez choisir un modèle Z’man.",
  quantity: "Quantité invalide.",
  offer: "Veuillez choisir une offre.",
  bag1: "Choisissez la couleur de votre sac.",
  bag2: "Choisissez la couleur de votre 2e sac.",
};

/** Retourne un objet {champ: message}. Vide = valide. */
export function validateOrder(f) {
  var e = {};
  var name = String(f.fullName || "").trim().replace(/\s+/g, " ");
  var parts = name.split(" ");
  if (!(parts.length >= 2 && parts.every(function (p) { return p.length >= 1; }) && /[\p{L}]{2,}/u.test(name) && name.length >= 4))
    e.fullName = MSG.name;

  var phone = String(f.phone || "").trim();
  if (!phone) e.phone = MSG.phoneRequired;
  else if (!isValidMoroccanPhone(phone)) e.phone = MSG.phoneInvalid;

  if (String(f.city || "").trim().length < 2) e.city = MSG.city;
  if (String(f.address || "").trim().length < 8) e.address = MSG.address;
  // Offre + une couleur par sac (f.bags = ids choisis, f.offerQty = nombre de sacs attendu, f.validIds = ids autorisés)
  if (!f.offerId || !(f.offerQty >= 1)) e.offer = MSG.offer;
  else {
    var bags = f.bags || [], ids = f.validIds || null;
    for (var i = 0; i < f.offerQty; i++) {
      var id = bags[i];
      if (!id || (ids && ids.indexOf(id) === -1)) e["bag" + (i + 1)] = i === 0 ? MSG.bag1 : MSG.bag2;
    }
  }
  return e;
}

