import { config as C } from "../data/config.js";
import { products as P } from "../data/products.js";
import * as L from "../lib/logic.js";
import { analytics as A } from "../lib/events.js";
import { supabaseReady, placeOrder, checkPromo } from "../lib/supabase.js";
import { freeShip, shipFrag, noDot, esc, waHref } from "../lib/copy.js";

(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var money = function (n) { return L.formatMAD(n, C.currency); };
  var byId = function (id) { return P.filter(function (p) { return p.id === id; })[0]; };

  var state = { modelId: "rouge", offerId: "", bags: ["rouge", null], slide: 0, checkoutStarted: false, submitting: false, clientOrderId: A.newId(), done: false };

  /* ---------- 0. Valeurs issues de la config ---------- */
  /** Note + ventes + pastille « meilleure vente » : uniquement ce qui est renseigné dans ZMAN_CONFIG.trust. */
  function renderTrust() {
    var T = C.trust || {};
    var on = !!T.enabled, hasRating = on && T.rating > 0 && T.count > 0;
    var fr = function (n) { return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
    var badge = $("#best-badge"); badge.hidden = !(on && T.badge); $("#best-badge-text").textContent = T.badge || "";
    var box = $("#trust-proof"); box.hidden = !(hasRating || (on && T.soldThisWeek));
    if (box.hidden) return;
    $(".tp-stars", box).hidden = !hasRating; $("#tp-count").hidden = !hasRating; $("#tp-sold").hidden = !(on && T.soldThisWeek);
    if (hasRating) { $("#tp-rating").textContent = fr(T.rating); $("#tp-count").textContent = "(" + T.count + " clients)"; }
    if (on && T.soldThisWeek) $("#tp-sold").textContent = "🔥 " + T.soldThisWeek + " vendus cette semaine";
    var label = (hasRating ? "Note " + fr(T.rating) + " sur 5 d’après " + T.count + " clients. " : "") + (T.soldThisWeek ? "Plus de " + String(T.soldThisWeek).replace("+", "") + " sacs vendus cette semaine." : "");
    box.setAttribute("role", "group"); box.setAttribute("aria-label", label.trim());
  }

  function applyStatic() {
    renderTrust();
    $("#demo-ribbon").hidden = supabaseReady;
  }

  /* ---------- 1. Sélection de modèle (source unique) ---------- */
  function setModel(id, opts) {
    opts = opts || {};
    var m = byId(id); if (!m) return;
    var changed = state.modelId !== id;
    state.modelId = id; state.slide = 0;
    state.bags[0] = id; renderHero(m); renderSpecs(m); syncSwatches(); syncColorCards(); syncForm();
    $$(".js-price").forEach(function (e) { e.innerHTML = money(m.price); });
    if (changed) {
      // ViewContent n'est émis qu'UNE fois à l'arrivée (voir init) : changer de coloris ne gonfle pas ce compteur.
      A.track("SelectVariant", { content_ids: [String(m.wooProductId)], content_name: m.name, content_type: "product", value: m.price, currency: C.currency }, { custom: true });
    }
    if (opts.scroll) document.getElementById(opts.scroll).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
  function content(m, qty) { return { content_ids: [String(m.wooProductId)], content_name: m.name, content_type: "product", value: m.price * qty, currency: C.currency }; }

  /* ---------- 2. Hero : galerie + infos ---------- */
  function renderHero(m) {
    $("#p-name").textContent = m.name;
    $("#p-tagline").textContent = m.tagline;
    $("#p-blurb").textContent = m.blurb;
    $("#p-price").innerHTML = money(m.price);
    var ref = $("#p-ref");
    if (C.showReferencePrice && m.referencePrice > m.price) { ref.hidden = false; ref.innerHTML = money(m.referencePrice); ref.setAttribute("aria-label", "Ancien prix " + m.referencePrice + " dirhams"); }
    else ref.hidden = true;
    $("#swatch-current").textContent = m.colorLabel;

    var track = $("#g-track");
    track.innerHTML = m.images.map(function (im, i) {
      return '<div class="g-slide" role="group" aria-roledescription="diapositive" aria-label="Photo ' + (i + 1) + " sur " + m.images.length + '">' +
        '<img src="' + im.src + '" alt="' + im.alt + '" width="' + im.w + '" height="' + im.h + '" ' +
        (i === 0 ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async"></div>';
    }).join("");
    track.scrollLeft = 0;
    $("#g-thumbs").innerHTML = m.images.map(function (im, i) {
      return '<button type="button" class="g-thumb" data-i="' + i + '" aria-label="Voir la photo ' + (i + 1) + '"><img src="' + im.src + '" alt="" width="64" height="64" loading="lazy"></button>';
    }).join("");
    updateGalleryUI();
  }
  function updateGalleryUI() {
    var m = byId(state.modelId);
    $$(".g-thumb").forEach(function (b, i) { b.setAttribute("aria-current", i === state.slide ? "true" : "false"); });
    $("#g-count").textContent = (state.slide + 1) + " / " + m.images.length;
    $("#g-prev").disabled = state.slide === 0; $("#g-next").disabled = state.slide === m.images.length - 1;
  }
  function goSlide(i) {
    var t = $("#g-track"), m = byId(state.modelId);
    i = Math.max(0, Math.min(m.images.length - 1, i));
    t.scrollTo({ left: i * t.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    state.slide = i; updateGalleryUI();
  }
  function initGallery() {
    $("#g-thumbs").addEventListener("click", function (e) { var b = e.target.closest(".g-thumb"); if (b) goSlide(+b.dataset.i); });
    $("#g-prev").addEventListener("click", function () { goSlide(state.slide - 1); });
    $("#g-next").addEventListener("click", function () { goSlide(state.slide + 1); });
    $("#g-track").addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goSlide(state.slide + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goSlide(state.slide - 1); }
    });
    var tmr; $("#g-track").addEventListener("scroll", function () {
      clearTimeout(tmr); tmr = setTimeout(function () {
        var t = $("#g-track"); var i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
        if (i !== state.slide) { state.slide = i; updateGalleryUI(); }
      }, 80);
    }, { passive: true });
  }

  /* ---------- 3. Swatches (vrais boutons radio) ---------- */
  function initSwatches() {
    $("#swatch-list").addEventListener("change", function (e) { if (e.target.name === "swatch") setModel(e.target.value); });
  }
  function syncSwatches() { var r = $("#sw-" + state.modelId); if (r) r.checked = true; }

  /* ---------- 4. Specs ---------- */
  function renderSpecs(m) {
    $("#d-model").textContent = m.name;
    var rows = [
      ["Dimensions", m.dimensions], ["Poids", m.weight], ["Matières", m.materials], ["Couleurs", m.color],
      ["Fermeture", m.closure], ["Chaîne", m.chain], ["Intérieur", m.lining], ["Port", m.carry || "Avec la chaîne dorée détachable"], ["Fabrication", m.origin],
    ];
    $("#specs").innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("");
    $("#d-official").textContent = m.officialDescription;
  }

  /* ---------- 5. Cartes couleur ---------- */
  function initColorCards() {
    $("#color-grid").addEventListener("click", function (e) {
      var b = e.target.closest(".cc-btn"); if (!b) return;
      setModel(b.dataset.id, { scroll: "order" });
    });
  }
  function syncColorCards() {
    $$(".color-card").forEach(function (c) {
      var sel = c.dataset.id === state.modelId; c.dataset.selected = sel;
      $(".cc-btn", c).textContent = sel ? "✓ Sélectionné" : "Choisir ce modèle";
    });
  }

  function defaultOfferId() { var d = (C.offers || []).filter(function (o) { return o.defaultSelected; })[0] || C.offers[0]; return d.id; }
  function initOffer() { state.offerId = defaultOfferId(); renderOffers(); renderPickers(); syncForm(); }

  /* ---------- 6. Offre + couleurs + récapitulatif + formulaire ---------- */
  var OFFERS = C.offers || [];
  function offerById(id) { return OFFERS.filter(function (o) { return o.id === id; })[0]; }
  function curOffer() { return offerById(state.offerId); }

  /** Prix des sacs de l'offre : couleur choisie, sinon prix du modèle courant (même prix sur toute la collection). */
  function bagPrices(o) {
    var ref = byId(state.modelId).price, out = [];
    for (var i = 0; i < o.qty; i++) { var p = byId(state.bags[i]); out.push(p ? p.price : ref); }
    return out;
  }
  /* Codes promo : le pourcentage et le montant viennent de la base (apply_promo), pas de la config.
     Config = repli si Supabase est absent ou injoignable. Un code absent / inactif / non valable pour ces sacs masque l'offre. */
  var promoCache = {}; // "CODE|id,id" → { percent, discount } | null (refusé) | "err" (injoignable)
  function bagIds(o) { var ids = []; for (var i = 0; i < o.qty; i++) ids.push(state.bags[i] || state.modelId); return ids; }
  function promoKey(o) { return o.code + "|" + bagIds(o).join(","); }
  function promoOf(o) { return o.code && supabaseReady ? promoCache[promoKey(o)] : undefined; }
  function offerAvailable(o) { return promoOf(o) !== null; }
  function offerPercent(o) { var r = promoOf(o); return r && r !== "err" ? r.percent : o.discountPercent; }
  function ensurePromos() {
    OFFERS.forEach(function (o) {
      if (!o.code || !supabaseReady) return;
      var key = promoKey(o); if (key in promoCache) return;
      promoCache[key] = undefined; var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, C.order.timeoutMs);
      checkPromo(o.code, bagIds(o), ctrl.signal).then(function (r) { promoCache[key] = r; }, function () { promoCache[key] = "err"; })
        .then(function () { clearTimeout(to); if (!OFFERS.some(function (x) { return promoKey(x) === key; })) return; promosChanged(); });
    });
  }
  /** Un résultat serveur est arrivé : offre masquée si le code est refusé, textes et totaux recalculés. */
  function promosChanged() {
    if (!offerAvailable(curOffer())) state.offerId = defaultOfferId();
    renderOffers(); syncForm(); syncFaqOffer();
  }
  function syncFaqOffer() {
    var d = OFFERS.filter(function (o) { return o.code; })[0]; if (!d) return;
    $$("#faq-list details").forEach(function (el) {
      if (el.querySelector("summary").textContent.indexOf("Comment fonctionne l’offre") !== 0) return;
      el.hidden = !offerAvailable(d); var t = offerTotal(d);
      el.querySelector("p").innerHTML = "Vous choisissez " + d.qty + " sacs Z’man, dans la même couleur ou dans deux couleurs différentes. " + shipFrag + " et " + offerPercent(d) + "% de réduction automatique" + (d.code ? " (code " + esc(d.code) + " appliqué)" : "") + " : " + money(t.total) + " au lieu de " + money(t.subtotal) + ".";
    });
  }
  function offerTotal(o) {
    var r = promoOf(o), prices = bagPrices(o);
    if (r && r !== "err") { // montant calculé par le serveur pour exactement ces sacs
      var sub = prices.reduce(function (a, b) { return a + b; }, 0), ship = Number(C.shipping.cost) || 0;
      return { quantity: prices.length, subtotal: sub, discountPercent: r.percent, discount: r.discount, shipping: ship, total: sub - r.discount + ship };
    }
    return L.computeOrder(prices, o.discountPercent, C.shipping.cost);
  }

  function renderOffers() {
    $("#offer-list").innerHTML = OFFERS.filter(offerAvailable).map(function (o) {
      var t = offerTotal(o), unit = byId(state.modelId).price, id = "offer-" + o.id, lines;
      if (offerPercent(o) > 0) {
        lines = '<span class="offer-line">' + o.qty + " Sacs Z’man au choix.</span>" +
          '<span class="offer-line offer-adv"><b>Avantage :</b> ' + shipFrag + " + " + offerPercent(o) + "% de réduction automatique" + (o.code ? " (Code : " + esc(o.code) + " appliqué)" : "") + ".</span>" +
          '<span class="offer-line offer-est">Total estimé : <b class="offer-total">' + money(t.total) + '</b> au lieu de <s>' + money(t.subtotal) + "</s>.</span>";
      } else {
        lines = '<span class="offer-line">' + o.qty + " Sac Z’man au choix : <b>" + money(unit * o.qty) + "</b> (+ " + shipFrag + ").</span>";
      }
      return '<div class="offer"><input class="offer-input" type="radio" name="offer" id="' + id + '" value="' + o.id + '"' + (o.id === state.offerId ? " checked" : "") + ">" +
        '<label class="offer-card' + (o.badge ? " is-reco" : "") + '" for="' + id + '"><span class="offer-dot" aria-hidden="true"></span><span class="offer-body">' +
        '<span class="offer-top"><strong class="offer-title">' + esc(o.title) + "</strong>" + (o.badge ? '<span class="offer-badge">' + esc(o.badge) + "</span>" : "") + "</span>" + lines + "</span></label></div>";
    }).join("");
  }

  function renderPickers() {
    $("#bag-pickers").innerHTML = [1, 2].map(function (n) {
      return '<fieldset class="bag-set" id="bag-set-' + n + '"' + (n === 2 ? " hidden" : "") + ">" +
        '<legend><span id="bag-legend-' + n + '"></span> <span class="bag-picked" id="bag-picked-' + n + '"></span></legend>' +
        '<div class="bag-grid">' + P.map(function (p) {
          var id = "b" + n + "-" + p.id;
          return '<div class="bag-opt"><input class="bag-input" type="radio" name="bag' + n + '" id="' + id + '" value="' + p.id + '">' +
            '<label class="bag-btn" for="' + id + '"><span class="bag-circle"><img src="' + p.thumb + '" alt="" width="72" height="72" loading="lazy" decoding="async"></span>' +
            '<span class="bag-name">' + esc(p.formLabel || p.name) + "</span></label></div>";
        }).join("") + "</div>" + '<p class="err" id="e-bag' + n + '" hidden></p></fieldset>';
    }).join("");
  }

  /** Source unique d'affichage du formulaire : offre cochée, 1 ou 2 sélecteurs, couleurs cochées, récapitulatif. */
  function syncForm() {
    ensurePromos();
    var o = curOffer();
    $$('input[name="offer"]').forEach(function (i) { i.checked = i.value === o.id; });
    $("#bag-set-2").hidden = o.qty < 2;
    $("#bag-legend-1").textContent = o.qty > 1 ? "2. Sac 1 : choisissez sa couleur" : "2. Choisissez la couleur de votre sac";
    $("#bag-legend-2").textContent = "Sac 2 : choisissez sa couleur";
    [1, 2].forEach(function (n) {
      var id = state.bags[n - 1], p = byId(id);
      $$('input[name="bag' + n + '"]').forEach(function (i) { i.checked = i.value === id; });
      $("#bag-picked-" + n).textContent = p ? "· " + (p.formLabel || p.name) : "";
    });
    renderSummary();
  }

  function renderSummary() {
    var o = curOffer(), t = offerTotal(o), html = "";
    for (var i = 0; i < o.qty; i++) {
      var p = byId(state.bags[i]);
      html += '<li class="s-item">' + (p ? '<img src="' + p.thumb + '" alt="" width="52" height="52">' : '<span class="s-empty" aria-hidden="true">?</span>') +
        '<span class="s-txt"><span class="s-bag">' + (o.qty > 1 ? "Sac " + (i + 1) : "Votre sac") + "</span>" +
        '<span class="s-name">' + (p ? esc(p.name) : "Couleur à choisir") + "</span></span></li>";
    }
    $("#s-items").innerHTML = html;
    var disc = t.discount > 0;
    $("#t-sub-row").hidden = !disc; $("#t-disc-row").hidden = !disc;
    $("#t-sub").innerHTML = money(t.subtotal);
    $("#t-disc-label").textContent = "Réduction " + offerPercent(o) + "%" + (o.code ? " (" + o.code + " appliqué)" : "");
    $("#t-disc").innerHTML = "−" + money(t.discount);
    $("#t-ship").textContent = freeShip ? "0 MAD (offerte)" : "Selon la ville — à confirmer";
    $("#t-total").innerHTML = money(t.total);
    // Les cartes d'offre affichent aussi le total estimé : on les garde synchronisées avec le prix courant
    $$(".offer-total").forEach(function (e) { e.innerHTML = money(offerTotal(offerById("duo") || o).total); });
  }

  function selectedIds() { var o = curOffer(); return state.bags.slice(0, o.qty).filter(Boolean); }
  function selectedProducts() { return selectedIds().map(byId); }
  function orderText() {
    var o = curOffer(), names = selectedProducts().map(function (p) { return p.name; });
    return "Bonjour Maison Sabra, je souhaite commander : " + noDot(o.title) + (names.length ? " — " + names.join(" + ") : "");
  }

  var FIELD = { offer: "#offer-set", bag1: "#bag-set-1", bag2: "#bag-set-2", fullName: "#f-name", phone: "#f-phone", city: "#f-city", address: "#f-address" };
  var FOCUS = { offer: '#offer-list input:checked', bag1: '#bag-set-1 input', bag2: '#bag-set-2 input', fullName: "#f-name", phone: "#f-phone", city: "#f-city", address: "#f-address" };
  function showErrors(errs) {
    Object.keys(FIELD).forEach(function (k) {
      var el = $(FIELD[k]), msg = $("#e-" + k);
      if (!msg) return;
      if (errs[k]) { msg.textContent = errs[k]; msg.hidden = false; el.setAttribute("aria-invalid", "true"); }
      else { msg.hidden = true; el.removeAttribute("aria-invalid"); }
    });
  }
  function readForm() {
    var o = curOffer();
    return { fullName: $("#f-name").value, phone: $("#f-phone").value, city: $("#f-city").value, address: $("#f-address").value,
      notes: $("#f-notes").value, offerId: o.id, offerQty: o.qty, bags: state.bags.slice(0, o.qty),
      validIds: P.map(function (p) { return p.id; }) };
  }
  function alertBox(html) { var a = $("#form-alert"); a.innerHTML = html; a.hidden = !html; if (html) a.focus(); }
  function trackItems(t) {
    var ps = selectedProducts();
    return { content_ids: ps.map(function (p) { return String(p.wooProductId); }), content_type: "product", value: t.total, currency: C.currency, num_items: t.quantity };
  }

  function startCheckoutOnce() {
    if (state.checkoutStarted) return; state.checkoutStarted = true;
    var o = curOffer(); A.track("InitiateCheckout", trackItems(offerTotal(o)));
  }

  function initForm() {
    var form = $("#order-form");
    form.addEventListener("focusin", startCheckoutOnce);
    // Offre : changement => 1 ou 2 sélecteurs de couleur (la 1re couleur reste synchronisée avec la galerie)
    $("#offer-list").addEventListener("change", function (e) {
      if (e.target.name !== "offer" || !offerById(e.target.value)) return;
      state.offerId = e.target.value; showErrors({}); syncForm();
      var o = curOffer(); A.track("SelectOffer", { offer_id: o.id, num_items: o.qty, value: offerTotal(o).total, currency: C.currency }, { custom: true });
    });
    $("#bag-pickers").addEventListener("change", function (e) {
      var t = e.target; if (!t || (t.name !== "bag1" && t.name !== "bag2") || !byId(t.value)) return;
      if (t.name === "bag1") setModel(t.value);          // sac 1 = modèle de la galerie (met aussi à jour le formulaire)
      else { state.bags[1] = t.value; syncForm(); }
      $("#e-" + t.name).hidden = true; $("#bag-set-" + t.name.slice(3)).removeAttribute("aria-invalid");
    });
    $("#f-phone").addEventListener("blur", function () {
      var v = this.value; if (L.isValidMoroccanPhone(v)) this.value = L.formatPhoneDisplay(v);
    });
    ["f-name", "f-phone", "f-city", "f-address"].forEach(function (id) {
      $("#" + id).addEventListener("input", function () { var errs = L.validateOrder(readForm()); var k = { "f-name": "fullName", "f-phone": "phone", "f-city": "city", "f-address": "address" }[id]; if (!errs[k]) { $("#e-" + k).hidden = true; this.removeAttribute("aria-invalid"); } });
    });
    form.addEventListener("submit", onSubmit);
    window.__zmanReady = true; // le formulaire est prêt (voir le filet de sécurité dans Layout.astro)
  }

  function onSubmit(ev) {
    ev.preventDefault();
    if (state.submitting || state.done) return;
    alertBox("");
    if ($("#f-hp").value) return; // robot
    var data = readForm(), errs = L.validateOrder(data);
    showErrors(errs);
    var first = Object.keys(FIELD).filter(function (k) { return errs[k]; })[0];
    if (first) { var f = $(FOCUS[first]) || $(FIELD[first]); f.focus(); return; }

    var o = curOffer(), ps = selectedProducts();
    var btn = $("#submit-btn");
    state.submitting = true; btn.disabled = true; btn.textContent = "ENVOI EN COURS…";
    // L'offre exclusive n'est proposée que si la base reconnaît le code pour au moins une couleur.
    var wantUp = U.enabled && o.id === U.triggerOfferId && o.qty === 1 && ps.length === 1;
    (wantUp && upLive() ? loadUpPromos(ps[0].id) : Promise.resolve()).then(function () {
      capture(o, ps, data, true);
      // L'offre exclusive s'affiche AVANT l'enregistrement : la commande part (une seule fois) à la fin de ce parcours.
      if (session.upsell.status === "pending") { state.submitting = false; return go("upsell"); }
      finalize(fail);
    });
  }
  function fail(msg) {
    state.submitting = false; var b = $("#submit-btn"); b.disabled = false; b.textContent = "CONFIRMER MA COMMANDE";
    alertBox("<strong>" + msg + "</strong> Réessayez, ou contactez-nous : <a href=\"" + waHref(orderText()) + "\" rel=\"noopener\">WhatsApp</a> · <a href=\"tel:" + C.contact.phoneTel + "\">" + C.contact.phoneDisplay + "</a>.");
  }

  /** « Prénom Nom » → prénom + nom ; le repère de livraison facultatif est ajouté à l'adresse (la table `orders` n'a pas de colonne dédiée). */
  function customerOf(data) {
    var parts = String(data.fullName).trim().replace(/\s+/g, " ").split(" "), notes = String(data.notes || "").trim();
    return { firstName: parts[0], lastName: parts.slice(1).join(" "), phone: L.formatPhoneDisplay(data.phone),
      address: data.address.trim() + (notes ? " — " + notes : ""), city: data.city.trim() };
  }

  /** Mémorise la commande validée (rien n'est encore envoyé) et prépare l'upsell éventuel. */
  function capture(o, ps, data, upOk) {
    state.done = true;
    var simulated = !supabaseReady;
    var n = L.normalizePhone(data.phone);
    session = {
      clientOrderId: state.clientOrderId, orderRef: "", simulated: simulated, placed: simulated,
      customer: simulated ? null : customerOf(data),
      firstName: String(data.fullName).trim().split(/\s+/)[0] || "", phoneMasked: /^\d{10}$/.test(n) ? n.slice(0, 2) + " •• •• •• " + n.slice(8) : "",
      offerId: o.id, offerTitle: noDot(o.title), offerPct: offerPercent(o), offerDiscount: promoOf(o) && promoOf(o) !== "err" ? offerTotal(o).discount : null, offerCode: o.code || "",
      bags: ps.map(function (p) { return p.id; }), upsell: { status: "none" },
    };
    // Upsell UNIQUEMENT si : offre 1 choisie + une couleur choisie. En production, la réduction du 2e sac doit exister côté base
    // (code promo `upsell.code`) : sans ce code, l'offre n'est pas proposée (le serveur facturerait le plein tarif).
    var eligible = !!(U.enabled && upOk && (U.code || simulated) && o.id === U.triggerOfferId && o.qty === 1 && ps.length === 1);
    if (eligible) session.upsell = { status: "pending", deadline: Date.now() + (U.durationSeconds || 300) * 1000 };
    saveSession();
  }

  var finalizing = false;
  /** Enregistre la commande dans Supabase (fonction `place_order`) puis ouvre la page de remerciement. */
  function finalize(onError) {
    var s = session; if (!s) return;
    if (s.placed) return go("thanks");
    if (finalizing) return; finalizing = true;
    // Un seul code promo par commande : celui de l'offre, ou celui de l'upsell s'il a été accepté.
    var promo = s.upsell && s.upsell.status === "accepted" ? U.code : s.offerCode;
    var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, C.order.timeoutMs);
    placeOrder(s.customer, s.bags, promo || null, ctrl.signal).then(function (r) {
      clearTimeout(to); finalizing = false;
      var cust = s.customer;
      s.placed = true; s.orderRef = r.orderNumber; s.customer = null; // les coordonnées ne restent pas dans le navigateur
      saveSession();
      var ft = finalTotals(s);
      // Empreintes SHA-256 (jamais les données en clair) conservées pour l'API Conversions : Lead maintenant, Purchase plus tard.
      A.hashUser(cust).then(function (u) {
        s.mUser = u; saveSession();
        A.track("Lead", { content_ids: s.bags.map(function (id) { return String(byId(id).wooProductId); }), content_name: s.offerTitle, content_type: "product", value: ft.total, currency: C.currency, num_items: s.bags.length }, { user: u });
        go("thanks");
      });
    }).catch(function (e) {
      clearTimeout(to); finalizing = false;
      onError(e && e.code === "invalid_promo" ? "Le code de l’offre n’est plus valide, votre commande n’a pas été enregistrée."
        : "Connexion impossible : votre commande n’a peut-être pas été enregistrée.");
    });
  }
  /** Erreur d'enregistrement affichée depuis les vues « offre exclusive » / « offre terminée ». */
  function finalError(msg) {
    var box = $("#up-live").hidden ? $("#up-final-err") : $("#up-alert");
    if (!box) { box = document.createElement("p"); box.id = "up-final-err"; box.className = "form-alert"; box.setAttribute("role", "alert"); box.tabIndex = -1; $("#up-expired").appendChild(box); }
    box.innerHTML = "<strong>" + msg + "</strong> Réessayez, ou contactez-nous : <a href=\"" + waHref("Bonjour Maison Sabra, ma commande Z’man n’a pas pu être envoyée.") + "\" rel=\"noopener\">WhatsApp</a> · <a href=\"tel:" + C.contact.phoneTel + "\">" + C.contact.phoneDisplay + "</a>.";
    box.hidden = false; box.focus();
  }
  function toThanks() { if (!session || session.placed) return go("thanks"); finalize(finalError); }

  /* ---------- 10. Upsell + remerciement (vues à part, navigation par #) ---------- */
  var U = C.upsell || {};
  var HASHES = { upsell: "#/offre-exclusive", thanks: "#/merci" };
  var SKEY = "zman_order_v2", memSession = null, session = null, tickId = null, expireId = null, curView = "main";
  var priceOf = function (id) { return byId(id).price; };
  var nb = function (s) { return String(s).replace(/ /g, " "); };

  function loadSession() { try { var j = sessionStorage.getItem(SKEY); if (j) return JSON.parse(j); } catch (e) {} return memSession; }
  function saveSession() { memSession = session; try { sessionStorage.setItem(SKEY, JSON.stringify(session)); } catch (e) {} }
  function clearSession() { session = null; memSession = null; try { sessionStorage.removeItem(SKEY); } catch (e) {} }
  /* Événements propres au parcours post-commande : jamais de donnée personnelle, rien en mode démonstration. */
  function trackFlow(name, params) { if (!(session && session.simulated)) A.track(name, params || {}, { custom: true }); }

  function hashFor(view) { return view === "main" ? location.pathname + location.search : HASHES[view]; }
  function viewFromHash() { return location.hash === HASHES.upsell ? "upsell" : location.hash === HASHES.thanks ? "thanks" : "main"; }
  function clearTimers() { clearInterval(tickId); clearTimeout(expireId); tickId = expireId = null; }

  function go(view) {
    try { history.pushState(null, "", hashFor(view)); } catch (e) { /* iframe / aperçu : l'URL ne change pas, la vue change quand même */ }
    route(view);
  }

  /** Affiche la bonne vue en appliquant les garde-fous (pas d'upsell sans commande ni après expiration). */
  function route(want, force) {
    var view = want || viewFromHash();
    if (!session) session = loadSession();
    var up = session && session.upsell;
    if (view === "upsell") {
      if (up && up.status === "pending" && L.secondsLeft(up.deadline) <= 0) { up.status = "expired"; saveSession(); }
      if (!(up && up.status === "pending")) view = session ? "thanks" : "main";
    }
    if (view === "thanks" && !session) view = "main";
    if (view === "thanks" && !session.placed) { // commande pas encore envoyée : on termine l'offre exclusive, sinon on l'envoie
      if (up && up.status === "pending") view = "upsell";
      else { if (curView !== "thanks") finalize(finalError); return; }
    }
    if (view === "main" && state.done) resetOrder(); // retour arrière après une commande : on repart d'un formulaire propre
    if (view !== (want || viewFromHash())) { try { history.replaceState(null, "", hashFor(view)); } catch (e) {} }
    if (view === curView && !force) return;
    clearTimers(); curView = view; document.body.dataset.view = view;
    $$(".view").forEach(function (v) { v.hidden = v.id !== "view-" + view; });
    window.scrollTo(0, 0);
    if (view === "upsell") renderUpsell(); else if (view === "thanks") renderThanks();
  }

  function resetOrder() {
    var form = $("#order-form"); form.hidden = false; form.reset();
    state.offerId = defaultOfferId(); state.bags = [state.modelId, null];
    state.clientOrderId = A.newId(); state.checkoutStarted = false; state.done = false; state.submitting = false;
    var b = $("#submit-btn"); b.disabled = false; b.textContent = "CONFIRMER MA COMMANDE";
    clearSession(); showErrors({}); syncForm();
  }

  /* --- Upsell --- */
  function upChoiceId() { var r = $('input[name="upcolor"]:checked'); return r ? r.value : null; }

  /* Upsell réel : le code `U.code` ne s'applique qu'au 2e sac (apply_promo interrogée avec ce seul sac) ; le pourcentage et le montant
     viennent de la base. Sans Supabase (démo), l'ancien calcul « 2e sac à −X % » de la config est conservé. */
  var upCache = {}; // "id1,id2" → { percent, discount } | null (refusé) | "err"
  function upLive() { return supabaseReady && !!U.code; }
  function upPromo(a, b) { return upLive() ? upCache[a + "," + b] : undefined; }
  function upValid(r) { return !!r && r !== "err"; }
  var allIds = function () { return P.map(function (p) { return p.id; }); };
  /** Couleurs proposées : toutes sauf celle déjà commandée. */
  function upChoices(firstId) { return L.upsellChoices(allIds(), firstId); }
  function upMissing(firstId) { return L.upsellChoices(allIds(), firstId).some(function (id) { return !((firstId + "," + id) in upCache); }); }
  function loadUpPromos(firstId) {
    return Promise.all(L.upsellChoices(allIds(), firstId).map(function (id) {
      var key = firstId + "," + id; if (key in upCache) return;
      var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, C.order.timeoutMs);
      return checkPromo(U.code, [id], ctrl.signal).then(function (r) { upCache[key] = r; }, function () { upCache[key] = "err"; }).then(function () { clearTimeout(to); });
    }));
  }
  function upTotals(firstId, secondId) {
    var f = byId(firstId), sc = byId(secondId), ship = C.shipping.cost, r = upPromo(firstId, secondId);
    if (upValid(r)) {
      var sub = f.price + sc.price;
      return { firstPrice: f.price, secondPrice: sc.price, secondNet: sc.price - r.discount, discountPercent: r.percent, discount: r.discount, subtotal: sub, shipping: ship, total: sub - r.discount + ship };
    }
    if (upLive()) { // la base n'a pas confirmé le code : estimation locale sur toute la commande (le serveur fait foi à l'enregistrement)
      var o = L.computeOrder([sc.price], U.orderPercent, ship);
      return { firstPrice: f.price, secondPrice: sc.price, secondNet: sc.price - o.discount, discountPercent: o.discountPercent, discount: o.discount, subtotal: f.price + sc.price, shipping: ship, total: f.price + sc.price - o.discount + ship };
    }
    var t = L.computeUpsell(f.price, sc.price, U.discountPercent, ship); t.discountPercent = U.discountPercent; return t;
  }
  /** Totaux d'une commande avec upsell accepté, à partir de la session (montant serveur mémorisé si présent). */
  function upTotalsOf(s, ship) {
    var f = priceOf(s.bags[0]), sc = priceOf(s.bags[1]);
    if (s.upsell.discount != null) { var sub = f + sc; return { subtotal: sub, discount: s.upsell.discount, shipping: ship, total: sub - s.upsell.discount + ship }; }
    return L.computeUpsell(f, sc, s.upsell.pct, ship);
  }

  function renderUpsell() {
    if (upLive() && upMissing(session.bags[0])) { // rechargement de page : on relit la base
      return loadUpPromos(session.bags[0]).then(function () { if (curView === "upsell") renderUpsell(); });
    }
    var s = session, first = byId(s.bags[0]);
    $("#up-sim").hidden = !s.simulated;
    var pctOf = upTotals(s.bags[0], upChoices(s.bags[0])[0]).discountPercent;
    if (upLive()) $("#up-title").innerHTML = "Un 2<sup>e</sup> sac Z’man à <span id=\"up-pct\"></span>, rien que pour vous.";
    $("#up-pct").textContent = "−" + pctOf + " %";
    $("#up-current").innerHTML = '<img src="' + first.thumb + '" alt="" width="52" height="52"><span><small>Votre commande</small>' + esc(first.name) + " · " + nb(money(first.price)) + "</span>";
    // Les couleurs proposées excluent TOUJOURS celle déjà commandée sur la page principale.
    var ids = upChoices(s.bags[0]);
    $("#up-grid").innerHTML = ids.map(function (id) {
      var p = byId(id), n = upTotals(s.bags[0], id);
      return '<div class="up-opt"><input class="offer-input" type="radio" name="upcolor" id="up-' + id + '" value="' + id + '">' +
        '<label class="up-card" for="up-' + id + '"><span class="up-off">−' + n.discountPercent + "&nbsp;%</span>" +
        '<span class="up-img"><img src="' + p.thumb + '" alt="" width="240" height="240" loading="lazy" decoding="async"></span>' +
        '<span class="up-name">' + esc(p.formLabel || p.name) + '</span><span class="up-price"><s>' + money(p.price) + "</s><b>" + money(n.secondNet) + "</b></span></label></div>";
    }).join("");
    $("#e-up").hidden = true; $("#up-alert").hidden = true;
    $("#up-live").hidden = false; $("#up-expired").hidden = true; $("#up-bar-cta").hidden = false; $("#up-timer").hidden = false;
    var b = $("#up-accept"); b.removeAttribute("aria-busy"); b.disabled = false;
    renderUpsellSummary(); startCountdown();
    if (!s.upsell.viewed) { s.upsell.viewed = true; saveSession(); trackFlow("ViewUpsell", { value: priceOf(s.bags[0]), currency: C.currency }); }
    try { $("#up-title").focus({ preventScroll: true }); } catch (e) {}
  }

  function renderUpsellSummary() {
    var s = session, id = upChoiceId(), first = byId(s.bags[0]), second = id ? byId(id) : null;
    var t = upTotals(first.id, second ? second.id : upChoices(first.id)[0]);
    var li = function (img, label, name, price) {
      return '<li class="s-item">' + img + '<span class="s-txt"><span class="s-bag">' + label + '</span><span class="s-name">' + name + "</span></span>" + price + "</li>";
    };
    $("#up-items").innerHTML =
      li('<img src="' + first.thumb + '" alt="" width="52" height="52">', "Sac 1", esc(first.name), '<span class="s-price">' + nb(money(first.price)) + "</span>") +
      li(second ? '<img src="' + second.thumb + '" alt="" width="52" height="52">' : '<span class="s-empty" aria-hidden="true">?</span>',
         "Sac 2 · offre", second ? esc(second.name) : "Couleur à choisir",
         second ? '<span class="s-price"><s>' + nb(money(t.secondPrice)) + "</s>" + nb(money(t.secondNet)) + "</span>" : "");
    // Sans 2e sac choisi : rien d'offert à chiffrer, on n'affiche que le 1er sac + livraison.
    if (!second) t = { subtotal: first.price, discount: 0, total: first.price + t.shipping, shipping: t.shipping, discountPercent: t.discountPercent };
    $(".t-disc", $("#view-upsell")).hidden = !second;
    $("#up-sub").innerHTML = money(t.subtotal);
    $("#up-disc-label").textContent = "Offre exclusive −" + t.discountPercent + " %";
    $("#up-disc").innerHTML = "−" + money(t.discount);
    $("#up-ship").textContent = freeShip ? "0 MAD (offerte)" : "Selon la ville — à confirmer";
    $("#up-total").innerHTML = money(t.total);
    $("#up-bar-amount").innerHTML = money(t.total);
    $("#up-accept").textContent = second ? "AJOUTER À MA COMMANDE" : "CHOISIR UNE COULEUR";
  }

  function startCountdown() {
    var dl = session.upsell.deadline, total = U.durationSeconds || 300;
    function upd() {
      var left = L.secondsLeft(dl);
      $("#up-clock").textContent = L.formatCountdown(left);
      $("#up-bar").style.width = Math.min(100, left / total * 100) + "%";
      $("#up-timer").classList.toggle("is-urgent", left <= 60);
      if (left <= 0) expireUpsell();
    }
    upd(); if (curView === "upsell" && L.secondsLeft(dl) > 0) tickId = setInterval(upd, 500);
  }

  /** L'offre disparaît : plus de choix ni de bouton, message de fin, puis passage automatique au remerciement. */
  function expireUpsell() {
    clearTimers();
    if (curView !== "upsell" || !session) return;
    if (session.upsell.status === "pending") { session.upsell.status = "expired"; saveSession(); trackFlow("UpsellExpired"); }
    $("#up-live").hidden = true; $("#up-bar-cta").hidden = true; $("#up-timer").hidden = true; $("#up-expired").hidden = false;
    window.scrollTo(0, 0); try { $("#up-expired-title").focus({ preventScroll: true }); } catch (e) {}
    expireId = setTimeout(function () { if (curView === "upsell") toThanks(); }, 5000);
  }

  function acceptUpsell() {
    var s = session; if (!s || !s.upsell || s.upsell.status !== "pending") return;
    if (L.secondsLeft(s.upsell.deadline) <= 0) return expireUpsell();
    var id = upChoiceId();
    if (!id || !byId(id) || id === s.bags[0]) {
      var e = $("#e-up"); e.textContent = "Choisissez la couleur de votre 2e sac pour profiter de l’offre."; e.hidden = false;
      var f = $("#up-grid input"); if (f) f.focus(); return;
    }
    $("#e-up").hidden = true; $("#up-alert").hidden = true;
    var p = byId(id), t = upTotals(s.bags[0], id);
    var btn = $("#up-accept");
    s.bags.push(id); s.upsell.status = "accepted"; s.upsell.pct = t.discountPercent; s.upsell.discount = upLive() ? t.discount : null; s.upsell.secondId = id; saveSession();
    btn.setAttribute("aria-busy", "true"); btn.disabled = true; btn.textContent = "AJOUT EN COURS…";
    finalize(function (msg) {
      // échec : on revient à l'état « offre en cours » pour pouvoir réessayer tant que le compte à rebours court
      s.bags.pop(); s.upsell.status = "pending"; delete s.upsell.pct; delete s.upsell.discount; delete s.upsell.secondId; saveSession();
      btn.removeAttribute("aria-busy"); btn.disabled = false; renderUpsellSummary();
      finalError(/code de l’offre/.test(msg) ? "Cette offre exclusive n’est pas disponible pour le moment. Votre commande initiale est conservée : cliquez sur « Non merci » pour la confirmer." : msg);
    });
    trackFlow("UpsellAccepted", { content_ids: [String(p.wooProductId)], value: t.secondNet, currency: C.currency });
  }

  function declineUpsell() {
    var s = session; if (!s || !s.upsell) return;
    if (s.upsell.status === "pending") { s.upsell.status = "declined"; saveSession(); trackFlow("UpsellDeclined"); }
    toThanks();
  }

  /* --- Remerciement --- */
  /** Totaux FINAUX de la commande (upsell inclus) — source unique pour le récapitulatif et l'événement Purchase. */
  function finalTotals(s) {
    var ship = C.shipping.cost;
    if (s.upsell && s.upsell.status === "accepted" && s.bags.length === 2) return upTotalsOf(s, ship);
    return offerTotals(s, ship);
  }
  function offerTotals(s, ship) {
    var t = L.computeOrder(s.bags.map(priceOf), s.offerPct, ship);
    if (s.offerDiscount != null) { t.discount = s.offerDiscount; t.total = t.subtotal - s.offerDiscount + t.shipping; }
    return t;
  }
  function summaryRows(s) {
    var ship = C.shipping.cost, rows = [], t;
    if (s.upsell && s.upsell.status === "accepted" && s.bags.length === 2) {
      t = upTotalsOf(s, ship);
      rows.push(["Sous-total", money(t.subtotal)], ["Offre exclusive −" + s.upsell.pct + " %", "−" + money(t.discount), "t-disc"]);
    } else {
      t = offerTotals(s, ship);
      if (t.discount > 0) rows.push(["Sous-total", money(t.subtotal)], ["Réduction " + s.offerPct + "%" + (s.offerCode ? " (" + s.offerCode + " appliqué)" : ""), "−" + money(t.discount), "t-disc"]);
    }
    rows.push(["Livraison", freeShip ? "0 MAD (offerte)" : "Selon la ville — à confirmer"], ["Total à payer", money(t.total), "t-total"], ["Paiement", "À la livraison (espèces)"]);
    return rows;
  }

  function renderThanks() {
    var s = session;
    $("#ty-sim").hidden = !s.simulated;
    $("#ty-eyebrow").textContent = s.simulated ? "Aperçu de la page de remerciement" : "Commande reçue";
    $("#ty-title").textContent = "Merci" + (s.firstName ? " " + s.firstName : "") + ", votre commande est bien reçue.";
    $("#ty-lede").innerHTML = "Notre équipe vous appellera <strong>dans les plus brefs délais</strong> pour confirmer votre commande" +
      (s.phoneMasked ? " au <strong>" + esc(s.phoneMasked) + "</strong>" : "") + ". Pensez à garder votre téléphone à portée de main.";
    $("#ty-ref").textContent = s.orderRef ? "Votre commande · Réf. " + String(s.orderRef).replace(/[<>&"]/g, "") : "Votre commande";
    $("#ty-items").innerHTML = s.bags.map(function (id, i) {
      var p = byId(id), tag = s.bags.length > 1 ? "Sac " + (i + 1) + (i === 1 && s.upsell && s.upsell.status === "accepted" ? " · offre" : "") : "Votre sac";
      return '<li class="s-item"><img src="' + p.thumb + '" alt="" width="52" height="52"><span class="s-txt"><span class="s-bag">' + tag + '</span><span class="s-name">' + esc(p.name) + "</span></span></li>";
    }).join("");
    $("#ty-totals").innerHTML = summaryRows(s).map(function (r) { return "<div" + (r[2] ? ' class="' + r[2] + '"' : "") + "><dt>" + esc(r[0]) + "</dt><dd>" + nb(r[1]) + "</dd></div>"; }).join("");
    var delay = C.copy && C.copy.deliveryDelay, step = function (t, d) { return "<li><div><b>" + t + "</b><span>" + d + "</span></div></li>"; };
    $("#ty-steps").innerHTML =
      step("Nous vous appelons pour confirmer", "Un membre de l’équipe Maison Sabra vous contacte pour valider votre commande, vos coloris et votre adresse de livraison.") +
      step("Préparation et expédition", delay ? "Votre commande est préparée puis expédiée. Délai de livraison : " + esc(delay) + "." :
        'Une fois la commande confirmée, elle est préparée et expédiée par Maison Sabra, selon la <a href="' + C.links.delivery + '" target="_blank" rel="noopener">politique de livraison</a>.') +
      step("Livraison partout au Maroc", freeShip ? "La livraison est offerte. Le livreur vous contacte pour convenir de la remise du colis." : "Les frais de livraison, qui dépendent de votre ville, vous sont confirmés lors de l’appel.") +
      step("Vous payez à la réception", "Le règlement se fait en espèces, à la livraison. Aucun paiement en ligne n’est demandé.");
    $("#ty-help").innerHTML = 'Une question ? <a href="' + waHref("Bonjour Maison Sabra, j’ai une question sur ma commande Z’man.") + '" rel="noopener">WhatsApp</a> · <a href="tel:' + C.contact.phoneTel + '">' + C.contact.phoneDisplay + "</a>. Un souci à la réception ? Voir la " +
      '<a href="' + C.links.returns + '" target="_blank" rel="noopener">politique de retours</a>.';
    $("#ty-back").href = location.pathname;
    if (!s.thanksViewed) {
      s.thanksViewed = true; saveSession();
      var ft = finalTotals(s);
      trackFlow("ViewThankYou", { value: ft.total, currency: C.currency });
      if (!s.simulated) {
        // PURCHASE : la cliente a rempli le formulaire, il a été accepté, et elle atteint la page de remerciement.
        // Une seule fois par commande ; montant final (upsell inclus) ; aucune donnée personnelle ; eventID déterministe (déduplication CAPI).
        var pid = "purchase-" + s.clientOrderId;
        A.track("Purchase", { content_ids: s.bags.map(function (id) { return String(byId(id).wooProductId); }), content_type: "product", num_items: s.bags.length, value: ft.total, currency: C.currency }, { eventId: pid, user: s.mUser });
      }
    }
    try { $("#ty-title").focus({ preventScroll: true }); } catch (e) {}
  }

  function initViews() {
    window.addEventListener("popstate", function () { route(); });
    window.addEventListener("hashchange", function () { route(); });
    $("#up-grid").addEventListener("change", function () { $("#e-up").hidden = true; renderUpsellSummary(); });
    $("#up-accept").addEventListener("click", acceptUpsell);
    $("#up-decline").addEventListener("click", declineUpsell); $("#up-decline-2").addEventListener("click", declineUpsell);
    $("#up-continue").addEventListener("click", toThanks);
    route(null, true); // lien direct / rechargement : reprend l'upsell s'il court encore, sinon remerciement ou page principale
  }

  /* ---------- 8. Avis (uniquement s'ils existent dans la config) ---------- */
  function renderTestimonials() {
    var t = (C.testimonials || []).filter(function (x) { return x && x.text && x.author; });
    if (!t.length) return;
    var box = $("#testimonials"); box.hidden = false;
    box.innerHTML = t.map(function (x) { var e = function (s) { return String(s).replace(/[<>&"]/g, ""); };
      return '<blockquote class="quote">« ' + e(x.text) + " »<cite>" + e(x.author) + (x.source ? " · " + e(x.source) : "") + "</cite></blockquote>"; }).join("");
  }

  /* ---------- 9. CTA collant mobile ---------- */
  function initSticky() {
    var bar = $("#sticky-cta"), heroCta = $("#hero-cta"), order = $("#order"), vis = { hero: true, order: false };
    function upd() { bar.hidden = vis.hero || vis.order || state.done; }
    if (!("IntersectionObserver" in window)) { bar.hidden = true; return; }
    new IntersectionObserver(function (es) { vis.hero = es[0].isIntersecting || es[0].boundingClientRect.top > 0; upd(); }).observe(heroCta);
    new IntersectionObserver(function (es) { vis.order = es[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(order);
  }


  /* ---------- 9b. Vidéos (lecture au toucher, une seule à la fois) ---------- */
  function initReels() {
    var track = $("#reels-track"); if (!track) return;
    var vids = $$("video", track), cards = $$(".reel", track);
    var prev = $("#reels-prev"), next = $("#reels-next"), count = $("#reels-count");
    function setPlayingUI(v, on) { var b = $(".reel-play", v.parentNode); b.setAttribute("aria-pressed", on ? "true" : "false"); v.closest(".reel").classList.toggle("is-playing", on); }
    function pauseAll(except) { vids.forEach(function (v) { if (v !== except && !v.paused) { v.pause(); } setPlayingUI(v, v === except && !v.paused); }); }
    cards.forEach(function (card, i) {
      var v = $("video", card), b = $(".reel-play", card);
      function toggle() {
        if (v.paused) {
          pauseAll(v); v.muted = false;
          if (!v.controls) { v.controls = true; v.setAttribute("controlslist", "nodownload noplaybackrate"); card.classList.add("is-started"); } // barre native : pause/lecture, avancer/reculer, volume
          var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); });
          A.track("VideoPlay", { video_index: i + 1 }, { custom: true });
        } else { v.pause(); }
      }
      b.addEventListener("click", toggle);
      v.addEventListener("click", function () { if (!v.controls) toggle(); }); // une fois la barre native active, c’est elle qui gère le clic (évite le double basculement)
      v.addEventListener("play", function () { setPlayingUI(v, true); });
      v.addEventListener("pause", function () { setPlayingUI(v, false); });
    });
    // met en pause une vidéo qui sort de l'écran
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) { var v = e.target; if (!v.paused) v.pause(); } }); }, { threshold: 0.25 });
      vids.forEach(function (v) { io.observe(v); });
    }
    function step() { var c = cards[0]; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0) : 0; }
    function current() { return Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / Math.max(1, step())))); }
    function ui() {
      count.textContent = (current() + 1) + " / " + cards.length;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    var t; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(ui, 60); }, { passive: true });
    window.addEventListener("resize", ui); ui();
  }


  /* ---------- 9c. Images « moments » : photo générée si présente, sinon photo produit ---------- */
  function initMoments() {
    $$(".moment img[data-fallback]").forEach(function (im) {
      function fallback() { if (im.dataset.fb === "1") return; im.dataset.fb = "1"; im.src = im.dataset.fallback; }
      im.addEventListener("error", fallback);
      if (im.complete && im.naturalWidth === 0) fallback();
    });
  }

  /* ---------- 11. CTA tracking + init ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-cta]"); if (!a) return;
    A.track("CtaClick", { location: a.dataset.cta }, { custom: true });
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute("href") === "#") return;
    var t = document.getElementById(a.getAttribute("href").slice(1)); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    if (t.id === "order") { var f = $("#offer-list input:checked") || $("#f-name"); setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (x) {} }, reduceMotion ? 0 : 450); }
  });

  /** Chaque étape d'initialisation est isolée : une erreur ailleurs ne doit jamais empêcher le formulaire de fonctionner. */
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.error("[zman] init", fn.name, e); } }
  function init() {
    [applyStatic, initSwatches, initColorCards, initOffer, renderTestimonials, initGallery, initForm, initSticky, initReels, initMoments, initViews].forEach(safe);
    var q = new URLSearchParams(location.search).get("model");
    var start = q && byId(q) ? q : "rouge";
    state.modelId = ""; // force rendu initial
    A.init(); A.track("PageView"); // le Pixel doit être chargé AVANT tout événement
    setModel(start);
    A.track("ViewContent", content(byId(start), 1)); // chaque visiteur qui arrive sur la page = ViewContent (une seule fois)
  }
  init();
})();
