/**
 * Analytics — Meta Pixel (navigateur) prêt pour la déduplication avec l'API Conversions (serveur).
 * - Le Pixel ne se charge que si config.analytics.pixelId est renseigné.
 * - Le Pixel reçoit AUCUNE donnée personnelle. Le serveur (API Conversions) ne reçoit que des empreintes SHA-256
 *   (téléphone, prénom, nom, ville) pour Lead / Purchase — voir supabase/functions/meta-capi.
 * Événements (mappage voulu) :
 *   - PageView + ViewContent : une seule fois par arrivée sur la page (ViewContent = fiche produit vue).
 *   - Lead      : commande SOUMISE et acceptée par le backend (eventID = celui envoyé au serveur → déduplication CAPI).
 *   - Purchase  : la page de remerciement est atteinte après envoi du formulaire (une fois par commande, montant final
 *                 incluant l'éventuel upsell ; eventID = "purchase-<clientOrderId>" → déduplication CAPI).
 *   Rien n'est émis en mode démonstration (sans endpoint) pour Lead/Purchase.
 */
import { config } from "../data/config.js";

var C = config.analytics || {};
var SB_URL = import.meta.env.PUBLIC_SUPABASE_URL, SB_KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Relais API Conversions (Edge Function Supabase `meta-capi`) : le jeton Meta n'existe que côté serveur.
var CAPI_URL = SB_URL && SB_KEY ? SB_URL + "/functions/v1/meta-capi" : "";
var CAPI_EVENTS = { PageView: 1, ViewContent: 1, InitiateCheckout: 1, Lead: 1, Purchase: 1 };
var __A;
(function () {
  var ready = false;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "e-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function loadPixel() {
    if (!C.pixelId || ready) return;
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", C.pixelId);
    ready = true;
  }

  function log() {
    if (C.debug && window.console) console.log.apply(console, ["[zman-analytics]"].concat([].slice.call(arguments)));
  }

  function readCookie(n) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  /** _fbc si le Pixel l'a déjà posé, sinon reconstruit depuis ?fbclid= (format Meta : fb.1.<ms>.<fbclid>). */
  function fbcValue() {
    var c = readCookie("_fbc"); if (c) return c;
    var m = location.search.match(/[?&]fbclid=([^&#]+)/);
    return m ? "fb.1." + Date.now() + "." + decodeURIComponent(m[1]) : null;
  }

  function sha256(v) {
    var bytes = new TextEncoder().encode(String(v));
    return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }

  /** Normalisation Meta : minuscules, sans espaces/ponctuation ; téléphone en chiffres avec indicatif (212…). */
  function plain(v) { return String(v || "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); }
  function phoneDigits(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (/^0\d{9}$/.test(d)) return "212" + d.slice(1);
    return d;
  }

  /** { firstName, lastName, phone, city } → empreintes SHA-256 prêtes pour l'API Conversions. Ne rejette jamais. */
  function hashUser(c) {
    if (!c || !window.crypto || !crypto.subtle) return Promise.resolve({});
    var fields = { ph: phoneDigits(c.phone), fn: plain(c.firstName), ln: plain(c.lastName), ct: plain(c.city), country: "ma" };
    var keys = Object.keys(fields).filter(function (k) { return fields[k]; });
    return Promise.all(keys.map(function (k) { return sha256(fields[k]); })).then(function (hs) {
      var out = {}; keys.forEach(function (k, i) { out[k] = hs[i]; }); return out;
    }).catch(function () { return {}; });
  }

  /** Envoie l'événement au serveur (même event_id que le Pixel). Silencieux en cas d'échec. */
  function sendServer(name, params, eventId, user) {
    if (!CAPI_URL || !CAPI_EVENTS[name]) return;
    var ids = { fbp: readCookie("_fbp"), fbc: fbcValue() };
    try {
      fetch(CAPI_URL, {
        method: "POST", keepalive: true, credentials: "omit",
        headers: { "Content-Type": "application/json", apikey: SB_KEY },
        body: JSON.stringify({
          event_name: name, event_id: eventId, event_source_url: location.href,
          user_data: Object.assign({}, user || {}, ids.fbp ? { fbp: ids.fbp } : {}, ids.fbc ? { fbc: ids.fbc } : {}),
          custom_data: params || {},
        }),
      }).catch(function () {});
    } catch (e) { /* ne jamais casser la page */ }
  }

  /** standard=true → fbq('track'), sinon fbq('trackCustom'). eventId sert à dédupliquer avec le serveur. */
  function track(name, params, opts) {
    opts = opts || {};
    var eventId = opts.eventId || uuid();
    log(name, params, eventId);
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "zman_" + name, eventId: eventId, params: params || {} });
      if (ready && window.fbq) {
        window.fbq(opts.custom ? "trackCustom" : "track", name, params || {}, { eventID: eventId });
      }
      if (!opts.custom) sendServer(name, params, eventId, opts.user);
    } catch (e) { /* l'analytics ne doit jamais casser la page */ }
    return eventId;
  }

  __A = {
    init: loadPixel,
    track: track,
    newId: uuid,
    hashUser: hashUser,
    // Identifiants navigateur Meta (non directement personnels) utiles à l'API Conversions.
    browserIds: function () { return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") }; },
  };
})();
export const analytics = __A;
