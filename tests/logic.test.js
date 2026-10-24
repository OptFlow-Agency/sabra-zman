import assert from "node:assert";
import * as L from "../src/lib/logic.js";
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("phone formats normalise", () => {
  for (const v of ["0612345678","06 12 34 56 78","06-12-34-56-78","+212612345678","+212 6 12 34 56 78","00212612345678","212612345678","+212 (0)612345678","0712345678","0522334455"])
    assert.ok(L.isValidMoroccanPhone(v), v);
});
t("phone rejects bad", () => {
  for (const v of ["", "061234567", "06123456789", "0812345678", "abcdefghij", "+33612345678", "0012"]) assert.ok(!L.isValidMoroccanPhone(v), v);
});
t("E164", () => { assert.strictEqual(L.toE164("06 12 34 56 78"), "+212612345678"); assert.strictEqual(L.toE164("123"), null); });
t("display", () => assert.strictEqual(L.formatPhoneDisplay("+212612345678"), "06 12 34 56 78"));
t("totals", () => {
  assert.deepStrictEqual(L.computeTotal(549, 1, 0), { unitPrice: 549, quantity: 1, subtotal: 549, shipping: 0, total: 549 });
  assert.strictEqual(L.computeTotal(549, 3, 0).total, 1647);
  assert.strictEqual(L.computeTotal(549, 2, 30).total, 1128);
});
t("qty clamp", () => { assert.strictEqual(L.clampQty("x", 3), 1); assert.strictEqual(L.clampQty(9, 3), 3); assert.strictEqual(L.clampQty(0, 3), 1); });
t("offer totals (Duo = 988 au lieu de 1098)", () => {
  assert.deepStrictEqual(L.computeOrder([549], 0, 0), { quantity: 1, subtotal: 549, discountPercent: 0, discount: 0, shipping: 0, total: 549 });
  assert.deepStrictEqual(L.computeOrder([549, 549], 10, 0), { quantity: 2, subtotal: 1098, discountPercent: 10, discount: 110, shipping: 0, total: 988 });
  assert.strictEqual(L.computeOrder([549, 549], 10, 30).total, 1018);
  assert.strictEqual(L.computeOrder([], 10, 0).total, 0);
  assert.strictEqual(L.computeOrder([549, 549], 150, 0).total, 0); // % borné à 100
});
t("validation (offre + couleur par sac)", () => {
  const ids = ["rouge", "vert", "violet", "beige", "multicolore"];
  const ok = { fullName: "Salma Alaoui", phone: "06 12 34 56 78", city: "Rabat", address: "12 rue Moulay Ismail, Agdal", offerId: "simple", offerQty: 1, bags: ["rouge"], validIds: ids };
  assert.deepStrictEqual(L.validateOrder(ok), {});
  // Duo : mêmes couleurs ou couleurs différentes = valides
  assert.deepStrictEqual(L.validateOrder({ ...ok, offerId: "duo", offerQty: 2, bags: ["rouge", "rouge"] }), {});
  assert.deepStrictEqual(L.validateOrder({ ...ok, offerId: "duo", offerQty: 2, bags: ["rouge", "vert"] }), {});
  // Duo : 2e couleur manquante ou inconnue
  assert.deepStrictEqual(Object.keys(L.validateOrder({ ...ok, offerId: "duo", offerQty: 2, bags: ["rouge", null] })), ["bag2"]);
  assert.deepStrictEqual(Object.keys(L.validateOrder({ ...ok, offerId: "duo", offerQty: 2, bags: ["rouge", "bleu"] })), ["bag2"]);
  // Offre simple : un 2e sac éventuellement mémorisé est ignoré
  assert.deepStrictEqual(L.validateOrder({ ...ok, bags: ["rouge", "inconnu"] }), {});
  const e = L.validateOrder({ fullName: "Salma", phone: "12", city: "", address: "abc", offerId: "simple", offerQty: 1, bags: [], validIds: ids });
  assert.deepStrictEqual(Object.keys(e).sort(), ["address","bag1","city","fullName","phone"]);
  assert.deepStrictEqual(Object.keys(L.validateOrder({ ...ok, offerId: "", offerQty: 0 })), ["offer"]);
  assert.ok(L.validateOrder({ ...ok, fullName: "فاطمة الزهراء" }).fullName === undefined);
});
t("upsell price: 549 + 25% off the 2nd (rounded down) = 960", () => {
  assert.deepStrictEqual(L.computeUpsell(549, 549, 25, 0), { firstPrice: 549, secondPrice: 549, secondNet: 411, discountPercent: 25, discount: 138, subtotal: 1098, shipping: 0, total: 960 });
  assert.strictEqual(L.computeUpsell(549, 549, 0, 0).total, 1098);
  assert.strictEqual(L.computeUpsell(549, 549, 25, 30).total, 990);
});
t("upsell never offers the colour already ordered", () => {
  const all = ["rouge", "vert", "violet", "beige", "multicolore"];
  for (const ordered of all) {
    const c = L.upsellChoices(all, ordered);
    assert.strictEqual(c.length, 4); assert.ok(!c.includes(ordered));
    assert.deepStrictEqual(c, all.filter((x) => x !== ordered)); // même ordre, 4 autres couleurs
  }
});
t("countdown: 5 minutes, never negative, mm:ss", () => {
  const t0 = 1_000_000, deadline = t0 + 300 * 1000;
  assert.strictEqual(L.secondsLeft(deadline, t0), 300);
  assert.strictEqual(L.secondsLeft(deadline, t0 + 1), 300);       // arrondi au-dessus
  assert.strictEqual(L.secondsLeft(deadline, t0 + 299_000), 1);
  assert.strictEqual(L.secondsLeft(deadline, t0 + 300_000), 0);
  assert.strictEqual(L.secondsLeft(deadline, t0 + 999_999), 0);
  assert.strictEqual(L.formatCountdown(300), "05:00"); assert.strictEqual(L.formatCountdown(299), "04:59"); assert.strictEqual(L.formatCountdown(0), "00:00"); assert.strictEqual(L.formatCountdown(-5), "00:00");
});
t("MAD format", () => assert.strictEqual(L.formatMAD(549, "MAD").replace(/ /g," "), "549 MAD"));
console.log(n + " tests passed");
