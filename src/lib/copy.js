import { config as C } from "../data/config.js";
import { products as P } from "../data/products.js";
import { computeOrder, formatMAD } from "./logic.js";

export const money = (n) => formatMAD(n, C.currency);
export const freeShip = !!(C.shipping && C.shipping.freeNationwide);
export const shipLong = freeShip ? "Livraison offerte partout au Maroc · Paiement à la livraison" : "Paiement à la livraison · Frais de livraison selon votre ville";
export const shipShort = freeShip ? "Livraison gratuite partout au Maroc · Paiement à la livraison" : "Paiement à la livraison · Frais de livraison selon la ville";
export const shipMicro = freeShip ? "Livraison gratuite" : "Paiement à la livraison";
export const shipFrag = freeShip ? "Livraison Gratuite" : "Frais de livraison selon la ville";
export const noDot = (s) => String(s).replace(/\.$/, "");
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const waHref = (msg) => "https://wa.me/" + C.contact.whatsappNumber + (msg ? "?text=" + encodeURIComponent(msg) : "");

export const cities = ["Casablanca","Rabat","Marrakech","Fès","Tanger","Agadir","Meknès","Oujda","Kénitra","Tétouan","Salé","Témara","Mohammedia","El Jadida","Béni Mellal","Nador","Settat","Safi","Essaouira","Laâyoune","Dakhla","Errachidia","Khouribga","Larache","Ouarzazate","Taza","Al Hoceïma"];

function duoFaq() {
  const d = (C.offers || []).find((o) => o.discountPercent > 0);
  if (!d) return null;
  const t = computeOrder([P[0].price, P[0].price].slice(0, d.qty), d.discountPercent, C.shipping.cost);
  return ["Comment fonctionne l’offre « " + noDot(d.title) + " » ?", "Vous choisissez " + d.qty + " sacs Z’man, dans la même couleur ou dans deux couleurs différentes. " + shipFrag + " et " + d.discountPercent + "% de réduction automatique" + (d.code ? " (code " + esc(d.code) + " appliqué)" : "") + " : " + money(t.total) + " au lieu de " + money(t.subtotal) + "."];
}

/** Questions fréquentes : [question, réponse HTML]. */
export function faqItems() {
  const allSame = P.every((p) => p.dimensions === P[0].dimensions && p.weight === P[0].weight);
  const wa = '<a href="' + waHref("Bonjour Maison Sabra, j’ai une question sur le sac Z’man.") + '" rel="noopener">WhatsApp</a>';
  return [
    ["Comment commander mon sac Z’man ?", "Choisissez la couleur de votre sac, remplissez le formulaire de cette page (nom, téléphone, ville, adresse) puis cliquez sur « Confirmer ma commande ». Pas de compte à créer, pas de paiement en ligne."],
    duoFaq(),
    ["Quels sont les moyens de paiement disponibles ?", "Le paiement se fait à la livraison. Aucun paiement n’est demandé au moment de la commande."],
    ["La livraison est-elle gratuite partout au Maroc ?", freeShip ? "Oui : sur cette page, la livraison est offerte partout au Maroc, pour les cinq modèles Z’man." : "Les frais de livraison dépendent de votre ville et sont confirmés avant l’expédition."],
    ["Quels sont les délais de livraison ?", C.copy.deliveryDelay ? "Délai de livraison : " + C.copy.deliveryDelay + "." : 'Selon la <a href="' + C.links.delivery + '" target="_blank" rel="noopener">politique de livraison</a> de Maison Sabra, les commandes standard sont expédiées sous 48 h ouvrées. Pour le délai d’arrivée dans votre ville, écrivez-nous sur ' + wa + "."],
    ["Quelles sont les dimensions du sac ?", allSame ? "Les cinq modèles mesurent " + P[0].dimensions + " et pèsent environ 350 g (poids estimé)." : "Les dimensions sont indiquées dans la rubrique « Détails » pour chaque modèle."],
    ["Comment se porte la chaîne ?", "La chaîne dorée est détachable : les fiches produit indiquent un port à la main ou à l’épaule. La longueur de la chaîne n’est pas publiée ; demandez-nous sur " + wa + " si elle est déterminante pour vous."],
    ["Que peut-on ranger à l’intérieur ?", "L’intérieur est doublé et le sac mesure " + P[0].dimensions + ". Nous ne publions pas de liste d’objets précis : dites-nous ce que vous souhaitez y mettre sur " + wa + " et nous vous répondrons."],
    ["Puis-je changer de modèle avant de confirmer ma commande ?", "Oui, à tout moment avant de cliquer sur « Confirmer ma commande » : changez de modèle avec le sélecteur de la page ou du formulaire."],
    ["Quelle est la politique de retour ou d’échange ?", 'Selon la <a href="' + C.links.returns + '" target="_blank" rel="noopener">politique officielle</a> de Maison Sabra, tout problème peut être signalé dans un délai de 3 jours après réception ; le remboursement intervient après validation et réception du retour. Consultez la page pour le détail complet.'],
    ["Comment contacter Maison Sabra ?", 'Par téléphone / WhatsApp au <a href="tel:' + C.contact.phoneTel + '">' + C.contact.phoneDisplay + '</a>, par e-mail à <a href="mailto:' + C.contact.email + '">' + C.contact.email + "</a>, ou sur Instagram @maison.sabra."],
  ].filter(Boolean);
}

/** JSON-LD Product/Offer (sans note, stock ni livraison inventés). */
export function productJsonLd(origin) {
  const abs = (src) => (/^https?:/.test(src) ? src : new URL(src, origin).href);
  return {
    "@context": "https://schema.org",
    "@graph": P.map((p) => ({
      "@type": "Product", name: p.name, url: p.url, brand: { "@type": "Brand", name: p.brand }, color: p.color, material: p.materials,
      description: p.officialDescription, image: p.images.map((i) => abs(i.src)),
      offers: { "@type": "Offer", price: String(p.price), priceCurrency: C.currency, url: p.url },
    })),
  };
}
