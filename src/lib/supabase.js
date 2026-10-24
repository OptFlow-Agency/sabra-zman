/**
 * Commandes → base Supabase de Maison Sabra (même base que la boutique et le tableau de bord admin).
 * La fonction SQL `place_order` recalcule les prix côté serveur à partir de la table `products` (par `slug`),
 * crée la ligne `orders` + les lignes `order_items` (statut « new ») et renvoie { order_number }.
 * Les prix envoyés par le navigateur ne sont donc jamais pris en compte.
 */
const URL = import.meta.env.PUBLIC_SUPABASE_URL;
const KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseReady = !!(URL && KEY);

/** id produit de la page (« rouge ») → slug de la table `products` (« zman-rouge »). */
export const slugOf = (id) => "zman-" + id;

/** [ "rouge", "rouge", "vert" ] → [{ slug: "zman-rouge", qty: 2 }, { slug: "zman-vert", qty: 1 }] */
export function toItems(ids) {
  var by = {}, out = [];
  ids.forEach(function (id) {
    var s = slugOf(id);
    if (!by[s]) { by[s] = { slug: s, qty: 0 }; out.push(by[s]); }
    by[s].qty++;
  });
  return out;
}

/** Appelle une fonction RPC. Lève une Error dont le message contient le texte de la réponse en cas d'échec. */
async function rpc(fn, body, signal) {
  var res = await fetch(URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + KEY },
    body: JSON.stringify(body),
    signal: signal,
    credentials: "omit",
  });
  if (!res.ok) { var e = new Error(await res.text().catch(function () { return String(res.status); })); e.status = res.status; throw e; }
  return res.json();
}

/**
 * Enregistre la commande. `customer` = { firstName, lastName, phone, address, city }, `ids` = un id produit par sac.
 * Renvoie { orderNumber }. Erreur `invalid_promo` : e.code === "invalid_promo".
 */
export async function placeOrder(customer, ids, promo, signal) {
  try {
    var r = await rpc("place_order", Object.assign({
      p_first_name: customer.firstName,
      p_last_name: customer.lastName,
      p_phone: customer.phone,
      p_address: customer.address,
      p_city: customer.city,
      p_items: toItems(ids),
    }, promo ? { p_promo: promo } : {}), signal);
    return { orderNumber: r && r.order_number != null ? String(r.order_number) : "" };
  } catch (e) {
    if (e && typeof e.message === "string" && e.message.indexOf("invalid_promo") !== -1) e.code = "invalid_promo";
    throw e;
  }
}

/**
 * Lit un code promo dans la base (fonction publique `apply_promo`, la même que le panier de la boutique).
 * Renvoie { percent, discount } si le code est actif ET valable pour ces produits, sinon null.
 * `discount` = montant de la réduction (MAD) calculé par le serveur pour exactement ces articles.
 */
export async function checkPromo(code, ids, signal) {
  var r = await rpc("apply_promo", { p_code: code, p_items: toItems(ids) }, signal);
  return r && r.percent > 0 ? { percent: Number(r.percent), discount: Number(r.discount) || 0 } : null;
}
