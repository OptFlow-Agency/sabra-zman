/**
 * Analytics — Meta Pixel (navigateur) prêt pour la déduplication avec l'API Conversions (serveur).
 * - Le Pixel ne se charge que si config.analytics.pixelId est renseigné.
 * - AUCUNE donnée personnelle (nom, téléphone, ville, adresse) n'est jamais envoyée dans un événement.
 * Événements (mappage voulu) :
 *   - PageView + ViewContent : une seule fois par arrivée sur la page (ViewContent = fiche produit vue).
 *   - Lead      : commande SOUMISE et acceptée par le backend (eventID = celui envoyé au serveur → déduplication CAPI).
 *   - Purchase  : la page de remerciement est atteinte après envoi du formulaire (une fois par commande, montant final
 *                 incluant l'éventuel upsell ; eventID = "purchase-<clientOrderId>" → déduplication CAPI).
 *   Rien n'est émis en mode démonstration (sans endpoint) pour Lead/Purchase.
 */
import { config } from "../data/config.js";

var C = config.analytics || {};
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
    } catch (e) { /* l'analytics ne doit jamais casser la page */ }
    return eventId;
  }

  function readCookie(n) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  __A = {
    init: loadPixel,
    track: track,
    newId: uuid,
    // Identifiants navigateur Meta (non directement personnels) utiles à l'API Conversions.
    browserIds: function () { return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") }; },
  };
})();
export const analytics = __A;
