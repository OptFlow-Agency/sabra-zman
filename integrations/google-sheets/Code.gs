/**
 * Maison Sabra — Z'man : réception des commandes dans Google Sheets (Google Apps Script, application Web).
 *
 * MISE EN PLACE (≈ 5 min, à faire par le propriétaire — voir docs/06-google-sheets-crm.md) :
 *  1. Créez un Google Sheet vide → Extensions → Apps Script → collez ce fichier → Enregistrer.
 *  2. Exécutez la fonction setup() une fois (autorisez l'accès) : crée les onglets « Commandes » et « Suivi ».
 *  3. Déployer → Nouveau déploiement → Application Web · Exécuter en tant que : Moi · Accès : Tout le monde.
 *  4. Copiez l'URL « …/exec » dans js/config.js → order.endpoint.
 *
 * OPTIONNEL (désactivé tant que les propriétés de script ne sont pas renseignées — Paramètres du projet → Propriétés du script) :
 *  - META_CAPI_TOKEN        : jeton API Conversions Meta (reste ICI, côté Google — jamais dans la page).
 *  - WA_TOKEN, WA_PHONE_ID, WA_TEMPLATE : WhatsApp Business Cloud API (message de confirmation automatique, modèle approuvé par Meta).
 *
 * Sécurité : les prix et remises sont RECALCULÉS ici (le montant envoyé par le navigateur est ignoré).
 * Les cellules commençant par = + - @ sont neutralisées (injection de formules).
 */

var PIXEL_ID = "1996064601208190";
var SHEET_ORDERS = "Commandes";
var SHEET_DASH = "Suivi";
var PRICE = 549;                                   // identique à js/products.js
var PRODUCT_NAMES = { rouge: "Rouge & Doré", vert: "Vert Émeraude", violet: "Violet Royal", beige: "Beige Brodé", multicolore: "Multicolore" };
var PRODUCT_WOO = { rouge: 1345, vert: 1358, violet: 1313, beige: 1353, multicolore: 1360 };
var OFFERS = { simple: { qty: 1, pct: 0, code: "" }, duo: { qty: 2, pct: 10, code: "GIFT64" } };   // identique à js/config.js
var UPSELL = { triggerOfferId: "simple", pct: 25, windowMs: 300 * 1000, graceMs: 15 * 1000 };
var STATUSES = ["Nouvelle", "Confirmée", "Injoignable", "À rappeler", "Annulée", "Livrée"];

var COLS = ["Date", "Réf", "ID commande", "Statut", "Nom", "Téléphone", "Ville", "Adresse", "Notes client", "Offre", "Sac 1", "Sac 2",
  "Sous-total", "Remise", "Livraison", "Total", "Upsell", "Page merci vue", "WhatsApp envoyé", "Notes équipe", "Source (URL)", "Pixel fbp"];
var C = {}; COLS.forEach(function (n, i) { C[n] = i + 1; });

function doGet() { return json_({ ok: true, service: "zman-orders" }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var b = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (b.type === "upsell") return json_(handleUpsell_(b));
    if (b.type === "thanks") return json_(handleThanks_(b));
    return json_(handleOrder_(b));
  } catch (err) {
    return json_({ ok: false, error: { message: "Votre commande n’a pas pu être enregistrée. Réessayez ou contactez-nous." } });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

/* ---------------- Commande ---------------- */
function handleOrder_(b) {
  var f = validate_(b); if (f) return { ok: false, error: { message: "Veuillez corriger les champs indiqués.", fields: f } };
  var sh = ordersSheet_(), id = String(b.clientOrderId);
  var found = findRow_(sh, id);
  if (found) return { ok: true, orderRef: sh.getRange(found, C["Réf"]).getValue() };          // idempotent : pas de doublon
  var offer = OFFERS[b.offer.id], subtotal = PRICE * offer.qty, total = Math.round(subtotal * (100 - offer.pct) / 100);
  var row = sh.getLastRow() + 1, ref = "ZM-" + Utilities.formatDate(new Date(), "Africa/Casablanca", "yyMMdd") + "-" + pad_(row - 1, 4);
  var c = b.customer, vals = [];
  vals[C["Date"] - 1] = new Date(); vals[C["Réf"] - 1] = ref; vals[C["ID commande"] - 1] = id; vals[C["Statut"] - 1] = "Nouvelle";
  vals[C["Nom"] - 1] = clean_(c.fullName); vals[C["Téléphone"] - 1] = String(c.phone); vals[C["Ville"] - 1] = clean_(c.city);
  vals[C["Adresse"] - 1] = clean_(c.address); vals[C["Notes client"] - 1] = clean_(c.notes || "");
  vals[C["Offre"] - 1] = offer.qty === 1 ? "L’Élégance Simple (1 sac)" : "Le Duo Signature (2 sacs, −" + offer.pct + " %" + (offer.code ? ", " + offer.code : "") + ")";
  vals[C["Sac 1"] - 1] = PRODUCT_NAMES[b.items[0].id]; vals[C["Sac 2"] - 1] = offer.qty > 1 ? PRODUCT_NAMES[b.items[1].id] : "";
  vals[C["Sous-total"] - 1] = subtotal; vals[C["Remise"] - 1] = subtotal - total; vals[C["Livraison"] - 1] = 0; vals[C["Total"] - 1] = total;
  vals[C["Upsell"] - 1] = ""; vals[C["Page merci vue"] - 1] = ""; vals[C["WhatsApp envoyé"] - 1] = ""; vals[C["Notes équipe"] - 1] = "";
  vals[C["Source (URL)"] - 1] = clean_(((b.attribution || {}).pageUrl || "") + ((b.attribution || {}).search || "")); vals[C["Pixel fbp"] - 1] = clean_((b.attribution || {}).fbp || "");
  for (var i = 0; i < COLS.length; i++) if (vals[i] === undefined) vals[i] = "";
  sh.getRange(row, 1, 1, COLS.length).setValues([vals]);
  SpreadsheetApp.flush();
  try { sendWhatsApp_(sh, row); } catch (e) {}                                                   // jamais bloquant
  return { ok: true, orderRef: ref };
}

/* ---------------- Upsell (2e sac) ---------------- */
function handleUpsell_(b) {
  var sh = ordersSheet_(), row = findRow_(sh, String(b.parentClientOrderId));
  if (!row) return { ok: false, error: { code: "ORDER_NOT_FOUND", message: "Commande introuvable." } };
  var r = sh.getRange(row, 1, 1, COLS.length).getValues()[0];
  if (String(r[C["Offre"] - 1]).indexOf("L’Élégance Simple") !== 0) return { ok: false, error: { code: "NOT_ELIGIBLE", message: "Offre non éligible." } };
  var wanted = b.upsell && b.upsell.item && b.upsell.item.id;
  if (r[C["Upsell"] - 1]) {                                                                      // nouvelle tentative après succès (réseau coupé) = OK ; autre coloris = refus
    return String(r[C["Upsell"] - 1]).indexOf("(" + PRODUCT_NAMES[wanted] + ")") > -1 ? { ok: true } : { ok: false, error: { code: "ALREADY_USED", message: "Offre déjà utilisée." } };
  }
  if (new Date().getTime() - new Date(r[C["Date"] - 1]).getTime() > UPSELL.windowMs + UPSELL.graceMs)
    return { ok: false, error: { code: "UPSELL_EXPIRED", message: "L’offre exclusive a expiré." } };
  var id = b.upsell && b.upsell.item && b.upsell.item.id;
  if (!PRODUCT_NAMES[id]) return { ok: false, error: { code: "BAD_ITEM", message: "Coloris inconnu." } };
  var second = Math.floor(PRICE * (100 - UPSELL.pct) / 100), total = PRICE + second;
  sh.getRange(row, C["Sac 2"]).setValue(PRODUCT_NAMES[id]);
  sh.getRange(row, C["Sous-total"], 1, 4).setValues([[PRICE * 2, PRICE * 2 - total, 0, total]]);
  sh.getRange(row, C["Upsell"]).setValue("Accepté −" + UPSELL.pct + " % (" + PRODUCT_NAMES[id] + ")");
  return { ok: true };
}

/* ---------------- Page de remerciement atteinte → Purchase serveur (déduplication par event_id) ---------------- */
function handleThanks_(b) {
  var sh = ordersSheet_(), row = findRow_(sh, String(b.parentClientOrderId));
  if (!row) return { ok: false };
  var cell = sh.getRange(row, C["Page merci vue"]);
  if (cell.getValue()) return { ok: true };
  cell.setValue(new Date());
  var token = PropertiesService.getScriptProperties().getProperty("META_CAPI_TOKEN");
  if (token) {
    var total = Number(sh.getRange(row, C["Total"]).getValue()) || 0;
    var body = { data: [{ event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: String(b.eventId), action_source: "website",
      user_data: { ph: [sha256_(String(sh.getRange(row, C["Téléphone"]).getValue()).replace("+", ""))], country: [sha256_("ma")], fbp: sh.getRange(row, C["Pixel fbp"]).getValue() || undefined },
      custom_data: { value: total, currency: "MAD", content_type: "product" } }] };
    try { UrlFetchApp.fetch("https://graph.facebook.com/v21.0/" + PIXEL_ID + "/events?access_token=" + encodeURIComponent(token),
      { method: "post", contentType: "application/json", payload: JSON.stringify(body), muteHttpExceptions: true }); } catch (e) {}
  }
  return { ok: true };
}

/* ---------------- WhatsApp : confirmation automatique (inactif sans identifiants) ---------------- */
function sendWhatsApp_(sh, row) {
  var p = PropertiesService.getScriptProperties(), t = p.getProperty("WA_TOKEN"), pid = p.getProperty("WA_PHONE_ID"), tpl = p.getProperty("WA_TEMPLATE");
  if (!t || !pid || !tpl) return;                                                                // [BLOQUÉ] identifiants WhatsApp Business manquants
  var r = sh.getRange(row, 1, 1, COLS.length).getValues()[0];
  var first = String(r[C["Nom"] - 1]).split(" ")[0], ref = r[C["Réf"] - 1], to = String(r[C["Téléphone"] - 1]).replace(/\D/g, "");
  var res = UrlFetchApp.fetch("https://graph.facebook.com/v21.0/" + pid + "/messages", { method: "post", contentType: "application/json",
    headers: { Authorization: "Bearer " + t }, muteHttpExceptions: true,
    payload: JSON.stringify({ messaging_product: "whatsapp", to: to, type: "template",
      template: { name: tpl, language: { code: "fr" }, components: [{ type: "body", parameters: [{ type: "text", text: first }, { type: "text", text: String(ref) }] }] } }) });
  sh.getRange(row, C["WhatsApp envoyé"]).setValue(res.getResponseCode() < 300 ? "Oui " + new Date().toISOString() : "Échec " + res.getResponseCode());
}

/* ---------------- Utilitaires ---------------- */
function validate_(b) {
  var f = {}, c = (b && b.customer) || {}, offer = OFFERS[b && b.offer && b.offer.id];
  if (!b || !b.clientOrderId) f.offer = "Requête invalide.";
  if (!/^\S+\s+\S+/.test(String(c.fullName || "").trim())) f.fullName = "Veuillez saisir votre prénom et votre nom.";
  if (!/^\+212[5-7]\d{8}$/.test(String(c.phone || ""))) f.phone = "Numéro de téléphone invalide.";
  if (String(c.city || "").trim().length < 2) f.city = "Veuillez indiquer votre ville.";
  if (String(c.address || "").trim().length < 8) f.address = "Adresse trop courte.";
  if (!offer) f.offer = "Offre inconnue.";
  else if (!b.items || b.items.length !== offer.qty || !b.items.every(function (i) { return i && PRODUCT_NAMES[i.id]; })) f.items = "Choisissez la couleur de chaque sac.";
  return Object.keys(f).length ? f : null;
}
function clean_(v) { v = String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 500); return /^[=+\-@]/.test(v) ? "'" + v : v; }
function pad_(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sha256_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s).trim().toLowerCase()).map(function (x) { return ("0" + (x & 255).toString(16)).slice(-2); }).join(""); }
function ordersSheet_() { return SpreadsheetApp.getActive().getSheetByName(SHEET_ORDERS) || setup(); }
function findRow_(sh, id) {
  var f = sh.getRange(2, C["ID commande"], Math.max(sh.getLastRow() - 1, 1), 1).createTextFinder(id).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}

/** À exécuter UNE fois : crée les onglets, la liste déroulante des statuts et le tableau de suivi (taux de confirmation). */
function setup() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(SHEET_ORDERS) || ss.insertSheet(SHEET_ORDERS);
  sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight("bold").setBackground("#6e1e3a").setFontColor("#ffffff");
  sh.setFrozenRows(1);
  sh.getRange(2, C["Téléphone"], 1000, 1).setNumberFormat("@");
  sh.getRange(2, C["Date"], 1000, 1).setNumberFormat("dd/MM/yyyy HH:mm");
  sh.getRange(2, C["Statut"], 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  var d = ss.getSheetByName(SHEET_DASH) || ss.insertSheet(SHEET_DASH), S = "'" + SHEET_ORDERS + "'!$D$2:$D";
  d.clear();
  d.getRange("A1:B1").setValues([["Suivi des commandes Z’man", ""]]).setFontWeight("bold");
  var rows = [["Commandes reçues", "=COUNTA('" + SHEET_ORDERS + "'!$C$2:$C)"]];
  STATUSES.forEach(function (s) { rows.push([s, "=COUNTIF(" + S + ',"' + s + '")']); });
  // Lignes : B2 reçues · B3 Nouvelle · B4 Confirmée · B5 Injoignable · B6 À rappeler · B7 Annulée · B8 Livrée
  rows.push(["Taux de confirmation = (Confirmée + Livrée) / reçues", "=IFERROR((B4+B8)/B2,0)"]);
  rows.push(["Taux de confirmation sur commandes traitées (hors Nouvelle et À rappeler)", "=IFERROR((B4+B8)/(B2-B3-B6),0)"]);
  rows.push(["Chiffre d’affaires confirmé (MAD)", "=SUMIFS('" + SHEET_ORDERS + "'!$P$2:$P," + S + ',"Confirmée")+SUMIFS(\'' + SHEET_ORDERS + "'!$P$2:$P," + S + ',"Livrée")']);
  d.getRange(2, 1, rows.length, 2).setFormulas(rows);
  d.getRange("B9:B10").setNumberFormat("0.0%"); d.setColumnWidth(1, 420);
  return sh;
}
