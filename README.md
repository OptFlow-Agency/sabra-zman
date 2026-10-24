# Z'man · Maison Sabra — Landing page COD (Astro)

Port Astro du site statique `sabra-zman-old`. Aucun changement visuel ni fonctionnel.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # sortie statique dans dist/
node tests/logic.test.js
```

- `src/data/config.js` : TOUS les réglages propriétaire (endpoint, offres, livraison, contact, pixel…)
- `src/data/products.js` : données produit (source unique)
- `src/lib/` : logique pure (`logic.js`), analytics Meta Pixel, textes partagés (`copy.js` : FAQ, JSON-LD, livraison)
- `src/components/` : sections de la page (rendues au build) ; `src/pages/index.astro` les assemble
- `src/scripts/app.js` : interactivité côté client (galerie, formulaire, upsell, remerciement)
- `public/assets/` : images et vidéos
- `server/`, `integrations/`, `docs/` : endpoint de référence, Google Sheets CRM, documentation (inchangés)

## Commandes → Supabase

Le formulaire appelle la fonction SQL `place_order` de la base Maison Sabra (celle du tableau de bord admin) :
`p_first_name, p_last_name, p_phone, p_address, p_city, p_items [{slug, qty}], p_promo`. Les prix sont recalculés
côté serveur ; la commande apparaît dans Admin → Commandes (statut `new`). Slugs : `zman-rouge|vert|violet|beige|multicolore`.
Copier `.env.example` en `.env` et renseigner `PUBLIC_SUPABASE_URL` et `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Sans ces variables : mode démonstration (rien n'est enregistré).

`server/` et `integrations/` (ancien endpoint / Google Sheets) ne sont plus utilisés par la page.
