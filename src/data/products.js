/**
 * Données produit — UNE source de vérité.
 * Source : pages produit officielles maisonsabra.ma (consultées le 15/10/2026).
 * Tout ce qui s'affiche (galerie, prix, specs, récapitulatif, JSON-LD) est lu ici.
 *
 * `null` = information non publiée par la marque → la ligne n'est pas affichée.
 */
  var UP = "https://maisonsabra.ma/wp-content/uploads/";
  var COMMON = {
    brand: "Maison Sabra",
    model: "Z’man",
    dimensions: "L 28 × H 20 × P 7 cm", // identiques sur les 5 pages produit
    weight: "≈ 350 g (poids estimé)",
    closure: "Fermoir métallique doré",
    chain: "Chaîne dorée détachable",
    origin: "Artisanale – Maroc",
    price: 549,
  };

  function p(o) {
    var r = {};
    for (var k in COMMON) r[k] = COMMON[k];
    for (var j in o) r[j] = o[j];
    r.slug = "zman-" + r.id; // slug de la table `products` (Supabase)
    return r;
  }

  const staticProducts = [
    p({
      id: "rouge",
      colorLabel: "Rouge",
      name: "Sac Z’man – Velours Rouge & Tissu Doré",
      formLabel: "Velours Rouge & Doré",
      url: "https://maisonsabra.ma/product/sac-zman-velours-rouge-brode-or/",
      wooProductId: 1345,
      sku: "sac002",
      referencePrice: 990,
      tagline: "Rouge intense, éclat doré.",
      blurb:
        "Un velours rouge vibrant en relief sur une base de tissu doré : le rouge s’affirme, l’or le fait respirer. Fermoir doré vintage et chaîne dorée détachable.",
      officialDescription:
        "Un sac qui attire tous les regards : velours rouge vibrant, broderies en relief sur tissu doré. Élégance affirmée et touche marocaine intemporelle.",
      materials: "Tissu doré avec velours rouge en relief",
      color: "Rouge & beige doré",
      lining: "Tissu intérieur",
      carry: "À l’épaule ou à la main, avec la chaîne dorée détachable",
      thumb: "/assets/rouge-1.webp",
      images: [
        { src: "/assets/products/rouge-1.webp", w: 1024, h: 1012, alt: "Sac Z’man rouge en velours relief sur tissu doré — gros plans : fermoir doré vintage, velours en relief, chaîne dorée" },
        { src: "/assets/products/rouge-2.webp", w: 1024, h: 1012, alt: "Sac Z’man rouge en velours relief sur tissu doré — porté avec un caftan en velours rouge" },
        { src: "/assets/products/rouge-3.webp", w: 1024, h: 1012, alt: "Sac Z’man rouge en velours relief sur tissu doré — vue de face, visuel Maison Sabra" },
        { src: "/assets/products/rouge-4.webp", w: 1024, h: 1012, alt: "Sac Z’man rouge en velours relief sur tissu doré — vue de trois quarts, chaîne dorée" },
        { src: "/assets/products/rouge-5.webp", w: 1024, h: 1012, alt: "Sac Z’man rouge en velours relief sur tissu doré — vue du dessus, intérieur doublé rouge" },
      ],
    }),
    p({
      id: "vert",
      colorLabel: "Vert",
      name: "Sac Z’man – Velours Vert & Tissu Doré",
      formLabel: "Velours Vert Émeraude",
      url: "https://maisonsabra.ma/product/sac-zman-velours-vert-tissu-dore/",
      wooProductId: 1358,
      sku: null,
      referencePrice: 945,
      tagline: "Un vert profond, une élégance affirmée.",
      blurb:
        "Velours vert profond en relief sur tissu doré lumineux, aux motifs géométriques inspirés des arts traditionnels. Chaîne fine dorée détachable.",
      officialDescription:
        "Majestueux et intemporel, le sac Z’man en velours vert profond et tissu doré lumineux met à l’honneur le style marocain avec une touche d’originalité.",
      materials: "Tissu doré avec velours en relief",
      color: "Vert & beige doré",
      lining: "Tissu intérieur noir ou assorti",
      carry: "À la main ou à l’épaule, avec la chaîne fine dorée détachable",
      thumb: "/assets/vert-1.webp",
      images: [
        { src: "/assets/products/vert-1.webp", w: 1024, h: 1012, alt: "Sac Z’man vert en velours relief sur tissu doré — porté avec un caftan en velours vert" },
        { src: "/assets/products/vert-2.webp", w: 1024, h: 1012, alt: "Sac Z’man vert en velours relief sur tissu doré — ouvert, intérieur vert foncé avec poche" },
        { src: "/assets/products/vert-3.webp", w: 1024, h: 1012, alt: "Sac Z’man vert en velours relief sur tissu doré — vue de trois quarts, chaîne dorée" },
        { src: "/assets/products/vert-4.webp", w: 1024, h: 1012, alt: "Sac Z’man vert en velours relief sur tissu doré — gros plans : fermoir doré vintage, velours en relief, chaîne dorée" },
        { src: "/assets/products/vert-5.webp", w: 1024, h: 1012, alt: "Sac Z’man vert en velours relief sur tissu doré — vue de face, visuel Maison Sabra" },
      ],
    }),
    p({
      id: "violet",
      colorLabel: "Violet royal",
      name: "Sac Z’man – Violet Royal & Doré en Velours Relief",
      formLabel: "Violet Royal en Relief",
      url: "https://maisonsabra.ma/product/sac-zman-velours-violet-brode-or/",
      wooProductId: 1313,
      sku: "sac001",
      referencePrice: 890,
      tagline: "Une touche de violet, un caractère singulier.",
      blurb:
        "Un violet royal intense en velours relief sur tissu doré scintillant, aux motifs baroques revisités. Fermoir vintage, chaîne dorée détachable.",
      officialDescription:
        "Alliance parfaite entre tradition et audace, ce sac en tissu doré et velours violet royal en relief illumine toutes vos tenues de cérémonie.",
      materials: "Tissu doré et velours en relief",
      color: "Violet royal & beige doré",
      lining: "Tissu intérieur noir ou assorti",
      carry: null,
      thumb: "/assets/violet-2.webp",
      images: [
        { src: "/assets/products/violet-1.webp", w: 1024, h: 1012, alt: "Sac Z’man violet royal en velours relief sur tissu doré — porté avec un caftan en velours violet" },
        { src: "/assets/products/violet-2.webp", w: 1024, h: 1012, alt: "Sac Z’man violet royal en velours relief sur tissu doré — ouvert, vue du dessus, intérieur noir" },
        { src: "/assets/products/violet-3.webp", w: 1024, h: 1012, alt: "Sac Z’man violet royal en velours relief sur tissu doré — vue de trois quarts, chaîne dorée" },
        { src: "/assets/products/violet-4.webp", w: 1024, h: 1012, alt: "Sac Z’man violet royal en velours relief sur tissu doré — gros plans : fermoir doré vintage, velours en relief, chaîne dorée" },
        { src: "/assets/products/violet-5.webp", w: 1024, h: 1012, alt: "Sac Z’man violet royal en velours relief sur tissu doré — vue de face, visuel Maison Sabra" },
      ],
    }),
    p({
      id: "beige",
      colorLabel: "Beige doré",
      name: "Sac Z’man – Velours Beige Brodé Doré",
      formLabel: "Beige Lumineux Brodé",
      url: "https://maisonsabra.ma/product/sac-zman-velours-beige-brode-dore/",
      wooProductId: 1353,
      sku: null,
      referencePrice: 949,
      tagline: "La douceur des tons naturels.",
      blurb:
        "Velours beige brodé de fils dorés, pour une lumière douce. Forme arrondie et généreuse, chaîne dorée légère, fermeture métallique dorée.",
      officialDescription:
        "Élégance subtile et lumière naturelle : ce sac en velours beige brodé d’or est l’allié raffiné des tenues de cérémonie ou des soirées chics.",
      materials: "Velours brodé, métal doré",
      color: "Beige avec broderies dorées",
      lining: "Tissu intérieur noir ou assorti",
      carry: "À l’épaule ou à la main, avec la chaîne dorée légère détachable",
      thumb: "/assets/beige-2.webp",
      images: [
        { src: "/assets/products/beige-1.webp", w: 1024, h: 1012, alt: "Sac Z’man beige en velours brodé de fils dorés — gros plans : fermoir doré vintage, velours brodé, chaîne dorée" },
        { src: "/assets/products/beige-2.webp", w: 1024, h: 1012, alt: "Sac Z’man beige en velours brodé de fils dorés — ouvert, vue du dessus, intérieur doublé" },
        { src: "/assets/products/beige-3.webp", w: 1024, h: 1012, alt: "Sac Z’man beige en velours brodé de fils dorés — porté avec un caftan en velours beige brodé" },
        { src: "/assets/products/beige-4.webp", w: 1024, h: 1012, alt: "Sac Z’man beige en velours brodé de fils dorés — vue de face, visuel Maison Sabra" },
        { src: "/assets/products/beige-5.webp", w: 1024, h: 1012, alt: "Sac Z’man beige en velours brodé de fils dorés — vue de trois quarts, chaîne dorée" },
      ],
    }),
    p({
      id: "multicolore",
      colorLabel: "Multicolore",
      name: "Sac Z’man – Tissu Velours Multicolore & Dorures",
      formLabel: "Velours Multicolore Bohème",
      url: "https://maisonsabra.ma/product/sac-zman-tissu-velours-multicolore-dorures/",
      wooProductId: 1360,
      sku: null,
      referencePrice: 890,
      tagline: "L’art de jouer avec les couleurs.",
      blurb:
        "Un velours multicolore — rouge, ocre, beige, noir — rehaussé de touches dorées artistiques, comme une peinture abstraite. Fermoir vintage, chaîne dorée fine détachable.",
      officialDescription:
        "Un sac à l’esprit artistique, habillé d’un velours multicolore sublimé de dorures. Une pièce audacieuse et élégante, parfaite pour les femmes de caractère.",
      materials: "Tissu velours multicolore avec impressions dorées",
      color: "Multicolore (rouge, ocre, beige, noir, or)",
      lining: "Tissu intérieur noir",
      carry: null,
      thumb: "/assets/multicolore-1.jpg",
      images: [
        { src: "/assets/products/multicolore-1.webp", w: 1024, h: 1012, alt: "Sac Z’man en velours multicolore aux dorures artistiques — vue de trois quarts, chaîne dorée" },
        { src: "/assets/products/multicolore-2.webp", w: 1024, h: 1012, alt: "Sac Z’man en velours multicolore aux dorures artistiques — ouvert, vue du dessus, intérieur doublé" },
        { src: "/assets/products/multicolore-3.webp", w: 1024, h: 1012, alt: "Sac Z’man en velours multicolore aux dorures artistiques — porté avec un caftan en velours terracotta" },
        { src: "/assets/products/multicolore-4.webp", w: 1024, h: 1012, alt: "Sac Z’man en velours multicolore aux dorures artistiques — gros plans : fermoir doré vintage, velours multicolore, chaîne dorée" },
        { src: "/assets/products/multicolore-5.webp", w: 1024, h: 1012, alt: "Sac Z’man en velours multicolore aux dorures artistiques — vue de face, visuel Maison Sabra" },
      ],
    }),
  ];

  /**
   * Lit la table `products` (collection « zman », actifs, triés par `sort_order`) et superpose
   * nom, prix, prix barré et pastille « nouveau » aux données éditoriales ci-dessus (galerie, textes, ids).
   * Si la base est injoignable ou vide, on garde les données statiques.
   */
  async function fromDb() {
    var url = import.meta.env.PUBLIC_SUPABASE_URL, key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    try {
      var res = await fetch(url + "/rest/v1/products?select=slug,name,price,was_price,is_new,sort_order&collection=eq.zman&active=eq.true&order=sort_order", {
        headers: { apikey: key, Authorization: "Bearer " + key },
        credentials: "omit",
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      var rows = await res.json();
      var out = [];
      rows.forEach(function (row) {
        var base = staticProducts.filter(function (b) { return b.slug === row.slug; })[0];
        if (!base) return; // produit sans page/galerie : ignoré
        var r = {};
        for (var k in base) r[k] = base[k];
        r.name = row.name;
        r.price = Number(row.price);
        r.referencePrice = row.was_price != null ? Number(row.was_price) : null;
        r.isNew = !!row.is_new;
        out.push(r);
      });
      return out.length ? out : null;
    } catch (e) {
      return null;
    }
  }

  export const products = (await fromDb()) || staticProducts;
