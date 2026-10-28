/**
 * Notification admin d'une nouvelle commande (Supabase Edge Function, Deno) via Resend.
 *
 * Appelée par un Database Webhook sur INSERT dans `public.orders` (voir docs/06-google-sheets-crm.md).
 * Le webhook part après le commit : les lignes `order_items` créées par `place_order` existent déjà.
 *
 * Secrets (supabase secrets set …) :
 *   RESEND_API_KEY     clé API Resend
 *   ADMIN_EMAIL        destinataire(s), séparés par des virgules
 *   RESEND_FROM        (optionnel) expéditeur, défaut « Maison Sabra <onboarding@resend.dev> » (domaine à vérifier pour la production)
 *   ADMIN_URL          (optionnel) URL du tableau de bord admin : bouton « Ouvrir le tableau de bord »
 *   ADMIN_PRODUCTS_URL (optionnel) URL de la page produits (défaut : ADMIN_URL + /products)
 *   WEBHOOK_SECRET     secret partagé : le webhook l'envoie dans l'en-tête `x-webhook-secret`
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   fournis automatiquement par Supabase
 *
 * Déploiement : supabase functions deploy notify-order --no-verify-jwt
 */

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function loadItems(order: Record<string, any>): Promise<Record<string, any>[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || order.id == null) return [];
  try {
    const res = await fetch(`${url}/rest/v1/order_items?order_id=eq.${encodeURIComponent(order.id)}&select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

/** slug → nom du produit (table `products`) ; en cas d'échec, « zman-rouge » devient « Zman rouge ». */
async function productNames(slugs: string[]): Promise<Record<string, string>> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || slugs.length === 0) return {};
  try {
    const list = slugs.map((s) => `"${s.replace(/"/g, "")}"`).join(",");
    const res = await fetch(`${url}/rest/v1/products?slug=in.(${encodeURIComponent(list)})&select=slug,name`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return {};
    return Object.fromEntries((await res.json()).filter((p: any) => p.name).map((p: any) => [p.slug, p.name]));
  } catch {
    return {};
  }
}

const prettySlug = (s: string) => {
  const t = s.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const safeUrl = (v: string | undefined) => (v && /^https?:\/\//.test(v) ? v : "");

const BURGUNDY = "#6e1e3a", IVORY = "#faf6ef", STONE = "#e6dccb", ESPRESSO = "#2a1d18", MUTED = "#6b5a50", GOLD = "#a98440";
const SERIF = "'Cormorant Garamond','Iowan Old Style',Georgia,serif";
const SANS = "Manrope,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const button = (href: string, label: string, primary: boolean) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:0 6px 10px;padding:13px 26px;border-radius:999px;font:700 12px ${SANS};letter-spacing:.12em;text-transform:uppercase;text-decoration:none;` +
  (primary ? `background:${BURGUNDY};color:#fff;border:1px solid ${BURGUNDY}` : `background:transparent;color:${BURGUNDY};border:1px solid ${BURGUNDY}`) +
  `">${esc(label)}</a>`;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false });

  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return json(401, { ok: false });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = (Deno.env.get("ADMIN_EMAIL") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!apiKey || to.length === 0) return json(503, { ok: false, error: "not_configured" });

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false });
  }
  if (payload.type !== "INSERT" || !payload.record) return json(200, { ok: true, skipped: true });

  const o = payload.record as Record<string, any>;
  const items = await loadItems(o);
  const ref = o.order_number ?? o.id ?? "?";
  const name = [o.first_name, o.last_name].filter(Boolean).join(" ") || o.customer_name || "—";

  const names = await productNames(items.map((i) => String(i.product_slug ?? i.slug ?? "")).filter(Boolean));
  const adminUrl = safeUrl(Deno.env.get("ADMIN_URL"));
  const productsUrl = safeUrl(Deno.env.get("ADMIN_PRODUCTS_URL")) || (adminUrl ? adminUrl.replace(/\/+$/, "") + "/products" : "");

  const row = (k: string, v: unknown) =>
    v == null || v === ""
      ? ""
      : `<tr><td style="padding:9px 0;border-bottom:1px solid ${STONE};font:600 11px ${SANS};letter-spacing:.1em;text-transform:uppercase;color:${MUTED};width:110px;vertical-align:top">${esc(k)}</td>` +
        `<td style="padding:9px 0;border-bottom:1px solid ${STONE};font:500 15px/1.4 ${SANS};color:${ESPRESSO}">${esc(v)}</td></tr>`;

  const itemsHtml = items.length
    ? `<p style="margin:28px 0 8px;font:600 11px ${SANS};letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Articles</p>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items
        .map((i) => {
          const slug = String(i.product_slug ?? i.slug ?? "");
          return `<tr><td style="padding:10px 0;border-bottom:1px solid ${STONE};font:500 15px ${SANS};color:${ESPRESSO}">${esc(names[slug] ?? (slug ? prettySlug(slug) : i.name ?? "Article"))}</td>` +
            `<td align="right" style="padding:10px 0;border-bottom:1px solid ${STONE};font:600 15px ${SANS};color:${BURGUNDY}">× ${esc(i.qty ?? i.quantity ?? 1)}</td></tr>`;
        })
        .join("")}</table>`
    : "";

  const clientName = String(o.first_name ?? "").trim() || String(o.customer_name ?? "").trim().split(/\s+/)[0] || "";
  const orderUrl = `https://maisonssabra.vercel.app/admin/commandes${clientName ? `?client=${encodeURIComponent(clientName)}` : ""}`;

  const buttons = [
    button(orderUrl, "Voir la commande", true),
    adminUrl && button(adminUrl, "Tableau de bord", false),
    productsUrl && button(productsUrl, "Voir les produits", false),
  ]
    .filter(Boolean)
    .join("");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:${IVORY}">
<div style="display:none;max-height:0;overflow:hidden">🎉 Félicitations ! Nouvelle commande #${esc(ref)} de ${esc(name)}${o.total != null ? `, ${esc(o.total)} MAD` : ""}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td align="center" style="padding:0 0 20px;font:600 20px ${SERIF};letter-spacing:.14em;text-transform:uppercase;color:${BURGUNDY}">Maison Sabra</td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${STONE};border-radius:14px;padding:32px 28px">
      <p style="margin:0 0 6px;font:700 11px ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${GOLD}">🎉 Félicitations, nouvelle commande !</p>
      <h1 style="margin:0 0 4px;font:600 34px/1.1 ${SERIF};color:${ESPRESSO}">Commande #${esc(ref)} 🛍️</h1>
      ${o.total != null ? `<p style="margin:0 0 22px;font:600 26px ${SERIF};color:${BURGUNDY}">${esc(o.total)} MAD <span style="font:500 12px ${SANS};color:${MUTED};letter-spacing:.04em">· paiement à la livraison</span></p>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Client", name)}${row("Téléphone", o.phone)}${row("Ville", o.city)}${row("Adresse", o.address)}${row("Code promo", o.promo_code ?? o.promo)}${row("Statut", o.status)}
      </table>
      ${itemsHtml}
    </td></tr>
    ${buttons ? `<tr><td align="center" style="padding:24px 0 0">${buttons}</td></tr>` : ""}
    <tr><td align="center" style="padding:20px 0 0;font:500 12px ${SANS};color:${MUTED}">📞 Appelez la cliente pour confirmer la commande.</td></tr>
  </table>
</td></tr></table></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM") ?? "Maison Sabra <onboarding@resend.dev>",
      to,
      subject: `🎉 Félicitations ! Nouvelle commande #${ref}${o.total != null ? ` · ${o.total} MAD` : ""} 🛍️`,
      html,
    }),
  });
  if (!res.ok) {
    console.error("resend failed", res.status, await res.text().catch(() => ""));
    return json(502, { ok: false });
  }
  return json(200, { ok: true });
});
