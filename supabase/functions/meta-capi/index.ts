/**
 * Meta Conversions API relay (Supabase Edge Function, Deno).
 *
 * Le navigateur envoie ici les mêmes événements standard que le Pixel (même `event_id` → déduplication).
 * Le jeton d'accès Meta reste ICI (secret Supabase), jamais dans la page.
 *
 * Secrets (supabase secrets set …) :
 *   META_CAPI_TOKEN        jeton d'accès du Pixel (Events Manager → Paramètres → API Conversions)
 *   META_PIXEL_ID          (optionnel) défaut 1996064601208190
 *   META_API_VERSION       (optionnel) défaut v23.0
 *   META_TEST_EVENT_CODE   (optionnel) code « Tester les événements » — à retirer en production
 *   ALLOWED_ORIGINS        (optionnel) origines autorisées, séparées par des virgules (ex. https://commande.maisonsabra.ma)
 *
 * Déploiement : supabase functions deploy meta-capi --no-verify-jwt
 * (la clé publishable du navigateur n'est pas un JWT, d'où --no-verify-jwt)
 */

const EVENTS = new Set(["PageView", "ViewContent", "InitiateCheckout", "Lead", "Purchase"]);
const HASH = /^[a-f0-9]{64}$/;
const USER_HASHED = ["ph", "fn", "ln", "ct", "country", "external_id"];
const CUSTOM_KEYS = ["value", "currency", "content_ids", "content_type", "content_name", "num_items"];

const origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") ?? "";
  const allow = origins.length === 0 ? "*" : origins.includes(o) ? o : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { ok: false });
  if (origins.length && !origins.includes(req.headers.get("origin") ?? "")) return json(req, 403, { ok: false });

  const token = Deno.env.get("META_CAPI_TOKEN");
  if (!token) return json(req, 503, { ok: false, error: "not_configured" });

  let b: Record<string, any>;
  try {
    const raw = await req.text();
    if (raw.length > 8000) return json(req, 413, { ok: false });
    b = JSON.parse(raw);
  } catch {
    return json(req, 400, { ok: false });
  }

  const name = String(b.event_name ?? "");
  const eventId = str(b.event_id, 100);
  if (!EVENTS.has(name) || !eventId) return json(req, 422, { ok: false });

  // user_data : uniquement des empreintes SHA-256 déjà calculées côté navigateur — jamais de donnée en clair.
  const u = (b.user_data ?? {}) as Record<string, unknown>;
  const user: Record<string, unknown> = {};
  for (const k of USER_HASHED) {
    const arr = (Array.isArray(u[k]) ? u[k] : [u[k]]).filter((h): h is string => typeof h === "string" && HASH.test(h));
    if (arr.length) user[k] = arr;
  }
  const fbp = str(u.fbp, 200), fbc = str(u.fbc, 300);
  if (fbp) user.fbp = fbp;
  if (fbc) user.fbc = fbc;
  user.client_user_agent = req.headers.get("user-agent") ?? undefined;
  user.client_ip_address = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;

  const cd = (b.custom_data ?? {}) as Record<string, unknown>;
  const custom: Record<string, unknown> = {};
  for (const k of CUSTOM_KEYS) if (cd[k] !== undefined && cd[k] !== null) custom[k] = cd[k];

  const pixel = Deno.env.get("META_PIXEL_ID") ?? "1996064601208190";
  const version = Deno.env.get("META_API_VERSION") ?? "v23.0";
  const test = Deno.env.get("META_TEST_EVENT_CODE");

  const payload = {
    data: [{
      event_name: name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: str(b.event_source_url, 2000),
      user_data: user,
      custom_data: custom,
    }],
    ...(test ? { test_event_code: test } : {}),
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${pixel}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("meta capi", res.status, await res.text().catch(() => ""));
      return json(req, 502, { ok: false });
    }
    return json(req, 200, { ok: true });
  } catch (e) {
    console.error("meta capi fetch failed", e);
    return json(req, 502, { ok: false });
  }
});
