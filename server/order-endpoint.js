/**
 * Endpoint de commande COD — RÉFÉRENCE À ADAPTER (Node 18+, aucune dépendance).
 *
 * Ce fichier ne se connecte à AUCUN système réel : `saveOrder()` est le seul point à brancher
 * (WooCommerce REST, Google Sheet, CRM, etc.). Tant qu'il n'est pas branché, il répond 501
 * et la page n'affichera jamais de faux succès.
 *
 * Variables d'environnement (jamais dans le front) :
 *   PORT, ALLOWED_ORIGIN (ex. https://commande.maisonsabra.ma),
 *   META_PIXEL_ID, META_CAPI_TOKEN (optionnel — envoi CAPI),
 *   WOO_URL, WOO_KEY, WOO_SECRET (si vous branchez WooCommerce)
 */
const http = require("http");
const crypto = require("crypto");

const PRODUCTS = { // prix FAISANT FOI côté serveur — jamais le montant envoyé par le navigateur
  rouge: { wooId: 1345, price: 549 }, vert: { wooId: 1358, price: 549 }, violet: { wooId: 1313, price: 549 },
  beige: { wooId: 1353, price: 549 }, multicolore: { wooId: 1360, price: 549 },
};
const SHIPPING = 0;
// Offres FAISANT FOI côté serveur (à garder identiques à ZMAN_CONFIG.offers). Le code GIFT64 est appliqué ICI :
// vérifiez qu'il existe dans votre boutique (WooCommerce > Marketing > Coupons) et qu'il se cumule bien avec le prix 549 MAD.
const OFFERS = { simple: { qty: 1, discountPercent: 0, code: null }, duo: { qty: 2, discountPercent: 10, code: "GIFT64" } };
function priceOrder(offer, items) { // mêmes arrondis que js/logic.js (computeOrder)
  const subtotal = items.reduce((s, i) => s + PRODUCTS[i.id].price, 0);
  const discounted = Math.round(subtotal * (100 - offer.discountPercent) / 100);
  return { subtotal, discount: subtotal - discounted, total: discounted + SHIPPING };
}
// Upsell post-commande : 2e sac à prix réduit, valable UNIQUEMENT pendant la fenêtre ci-dessous après la commande 1.
// À garder identique à ZMAN_CONFIG.upsell (js/config.js). La date de création vient d'ICI (serveur), jamais du navigateur.
const UPSELL = { triggerOfferId: "simple", discountPercent: 25, windowMs: (Number(process.env.UPSELL_SECONDS) || 300) * 1000, graceMs: 15000 };
const orders = new Map(); // commandes acceptées (en mémoire — utilisez votre base de données en production)
const seen = new Map(); // idempotence (en mémoire — utilisez Redis/DB en production)
const hits = new Map(); // limitation de débit simple par IP

async function saveOrder(order) {
  // TODO propriétaire : créer la commande dans votre système et retourner { orderRef }.
  // Exemple WooCommerce : POST {WOO_URL}/wp-json/wc/v3/orders (statut "on-hold", payment_method "cod",
  // meta clientOrderId pour éviter les doublons).
  const err = new Error("not_configured"); err.code = "NOT_CONFIGURED"; throw err;
}

async function saveUpsell(parent, item, total) {
  // TODO propriétaire : ajouter le 2e sac (item.wooId, prix item.price déjà remisé) à la commande `parent.orderRef`
  // et mettre le total à `total`. Retourner sans erreur seulement si la commande a vraiment été modifiée.
  const err = new Error("not_configured"); err.code = "NOT_CONFIGURED"; throw err;
}

async function sendCapi(order) {
  if (!process.env.META_PIXEL_ID || !process.env.META_CAPI_TOKEN) return;
  const sha = (v) => crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");
  const body = { data: [{ event_name: "Lead", event_time: Math.floor(Date.now() / 1000), event_id: order.eventId, action_source: "website",
    event_source_url: order.attribution.pageUrl,
    user_data: { ph: [sha(order.customer.phone.replace("+", ""))], ct: [sha(order.customer.city)], country: [sha("ma")], fbp: order.attribution.fbp || undefined, fbc: order.attribution.fbc || undefined },
    custom_data: { value: order.total, currency: "MAD", content_ids: order.items.map((i) => String(i.wooId)), num_items: order.quantity, content_type: "product" } }] };
  await fetch(`https://graph.facebook.com/v21.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
}

function validate(b) {
  const f = {}; const c = b && b.customer || {};
  if (!/^\S+\s+\S+/.test(String(c.fullName || "").trim())) f.fullName = "Veuillez saisir votre prénom et votre nom.";
  if (!/^\+212[5-7]\d{8}$/.test(String(c.phone || ""))) f.phone = "Numéro de téléphone invalide.";
  if (String(c.city || "").trim().length < 2) f.city = "Veuillez indiquer votre ville.";
  if (String(c.address || "").trim().length < 8) f.address = "Adresse trop courte.";
  const offer = OFFERS[b && b.offer && b.offer.id];
  if (!offer) f.offer = "Offre inconnue.";
  else if (!Array.isArray(b.items) || b.items.length !== offer.qty || !b.items.every((i) => i && PRODUCTS[i.id])) f.items = "Choisissez la couleur de chaque sac.";
  return f;
}

const send = (res, code, obj, origin) => {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin, "Vary": "Origin",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key", "Access-Control-Allow-Methods": "POST, OPTIONS" });
  res.end(JSON.stringify(obj));
};

async function handleUpsell(b, key, res, origin) {
  const fail = (code, status, message) => send(res, status, { ok: false, error: { code, message } }, origin);
  const parent = orders.get(b.parentClientOrderId);
  if (!parent) return fail("ORDER_NOT_FOUND", 404, "Commande introuvable.");
  if (parent.offerId !== UPSELL.triggerOfferId || parent.upsell) return fail("UPSELL_UNAVAILABLE", 409, "Cette offre n’est pas disponible pour cette commande.");
  if (Date.now() - parent.createdAt > UPSELL.windowMs + UPSELL.graceMs) return fail("UPSELL_EXPIRED", 410, "Cette offre exclusive a expiré.");
  const item = b.upsell && b.upsell.item;
  if (!item || !PRODUCTS[item.id]) return fail("BAD_ITEM", 422, "Modèle inconnu.");
  if (item.id === parent.itemId) return fail("SAME_COLOUR", 422, "Choisissez une autre couleur que celle déjà commandée.");
  // Prix recalculé ICI : 1er sac plein tarif + 2e sac remisé (549 + 411 = 960). Le montant du navigateur est ignoré.
  const net = Math.floor(PRODUCTS[item.id].price * (100 - UPSELL.discountPercent) / 100); // arrondi inférieur : identique à ZmanLogic.computeUpsell
  const total = PRODUCTS[parent.itemId].price + net + SHIPPING;
  try {
    await saveUpsell(parent, { id: item.id, wooId: PRODUCTS[item.id].wooId, price: net }, total);
    parent.upsell = { itemId: item.id, total };
    const out = { ok: true, orderRef: parent.orderRef, total }; if (key) seen.set(key, out);
    return send(res, 201, out, origin);
  } catch (e) {
    if (e.code === "NOT_CONFIGURED") return fail("NOT_CONFIGURED", 501, "L’ajout du second sac n’est pas encore activé.");
    return fail("SAVE_FAILED", 502, "Le sac n’a pas pu être ajouté. Votre commande initiale reste enregistrée.");
  }
}

http.createServer((req, res) => {
  const origin = process.env.ALLOWED_ORIGIN || "";
  if (req.method === "OPTIONS") return send(res, 204, {}, origin);
  if (req.method !== "POST") return send(res, 405, { ok: false }, origin);
  const ip = req.socket.remoteAddress; const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000); arr.push(now); hits.set(ip, arr);
  if (arr.length > 8) return send(res, 429, { ok: false, error: { message: "Trop de tentatives. Réessayez dans une minute." } }, origin);

  let raw = ""; req.on("data", (d) => { raw += d; if (raw.length > 20000) req.destroy(); });
  req.on("end", async () => {
    let b; try { b = JSON.parse(raw); } catch { return send(res, 400, { ok: false, error: { message: "Requête invalide." } }, origin); }
    const key = req.headers["idempotency-key"] || b.clientOrderId;
    if (key && seen.has(key)) return send(res, 200, seen.get(key), origin); // pas de doublon si re-soumis
    if (b.type === "upsell") return handleUpsell(b, key, res, origin);
    // Page de remerciement atteinte : accusé de réception (à brancher : marquer la commande + Purchase CAPI avec b.eventId, comme Code.gs).
    if (b.type === "thanks") return send(res, 200, { ok: true }, origin);
    const fields = validate(b);
    if (Object.keys(fields).length) return send(res, 422, { ok: false, error: { message: "Veuillez corriger les champs indiqués.", fields } }, origin);
    const offer = OFFERS[b.offer.id];
    const items = b.items.map((i) => ({ id: i.id, wooId: PRODUCTS[i.id].wooId, price: PRODUCTS[i.id].price }));
    const priced = priceOrder(offer, b.items);
    // On ignore expectedTotal / offer.discountPercent envoyés par le navigateur : seuls les chiffres serveur font foi.
    const order = { ...b, items, quantity: offer.qty, couponCode: offer.code, subtotal: priced.subtotal, discount: priced.discount, total: priced.total, payment: "cod" };
    try {
      const { orderRef } = await saveOrder(order);
      orders.set(b.clientOrderId, { createdAt: Date.now(), orderRef, offerId: b.offer.id, itemId: b.items[0].id, upsell: null });
      const out = { ok: true, orderRef }; if (key) seen.set(key, out);
      sendCapi(order); return send(res, 201, out, origin);
    } catch (e) {
      if (e.code === "NOT_CONFIGURED") return send(res, 501, { ok: false, error: { message: "La prise de commande n’est pas encore activée." } }, origin);
      return send(res, 502, { ok: false, error: { message: "Votre commande n’a pas pu être enregistrée. Réessayez ou contactez-nous." } }, origin);
    }
  });
}).listen(process.env.PORT || 8787, () => console.log("order endpoint on", process.env.PORT || 8787));
