/**
 * Kuraterade stockbilder per bransch + mallstämning (soft / lux / sharp).
 * Används för nya dokument, onboarding (fillSection "all") och ✦ Förslag på bilder.
 * Unsplash — följ deras licens vid produktion (t.ex. attribution där krävs).
 */
(function (global) {
  "use strict";

  function u(path, w, h) {
    return (
      "https://images.unsplash.com/" +
      path +
      "?auto=format&fit=crop&w=" +
      w +
      "&h=" +
      h +
      "&q=80"
    );
  }

  function simpleHash(s) {
    let h = 0;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /**
   * Snickare = person med verktyg, såg, trä, snickeriverkstad.
   * ALDRIG: ritningar, planlösningar, kontor, arkitekt, generell byggarbetsplats.
   */
  const SNICKARE_HERO_IDS = [
    "photo-1503387762-592deb58ef4e",
    "photo-1541753866382-081a052f842a",
    "photo-1530126523779-a94d246beee0",
    "photo-1621905251189-08cb45d6a269",
    "photo-1595844730298-6eccf7639344",
    "photo-1565187928347-8f7755a573b6",
    "photo-1615874950877-1a56667a2163",
  ];

  /**
   * Elektriker = elinstallation, kabeldragning, elcentral — aldrig snickare/trä/verkstad.
   */
  const ELEKTRIKER_HERO_IDS = [
    "photo-1621905252507-b7627934c31d",
    "photo-1473170466615-6d85025a0f24",
    "photo-1625047509168-028903f87f56",
    "photo-1581092160562-40aa08e78837",
    "photo-1558618666-fcd25c85cd64",
    "photo-1591696205602-4b09021a0b1e",
  ];

  /**
   * Present & inredning = heminredning, presenter, detaljer i miljö.
   * ALDRIG: klädbutik, mode, garderober, skobutik, generisk retail med kläder.
   */
  const INREDNING_HERO_IDS = [
    "photo-1616486338812-8284aa687c82",
    "photo-1586023492125-27b2c045efd7",
    "photo-1618221195710-dd6b41faaea6",
    "photo-1615529328331-p8918555dce2",
    "photo-1555041469-a586c61ea9bc",
    "photo-1493663284031-b7e3aefcae8f",
  ];

  const INREDNING_DETAIL_IDS = [
    "photo-1513885535751-8b9238b07182",
    "photo-1484101403633-562891789754",
    "photo-1543573868296-0618f4bd4a38",
    "photo-1615876238916-b4a8a64d5922",
    "photo-1616047006789-d1775e875851",
    "photo-156407851-177a701fdc42",
  ];

  const SMYCKEN_HERO_IDS = [
    "photo-1515562141207-021a0649a33c",
    "photo-1611596839882-674604be2c89",
    "photo-1535632066922-abd09999a012",
    "photo-1573408301185-9146fe634ad0",
    "photo-1605100802584-0ef3f840a22e",
  ];
  const SMYCKEN_DETAIL_IDS = [
    "photo-1605100802584-0ef3f840a22e",
    "photo-1515562141207-021a0649a33c",
    "photo-1611596839882-674604be2c89",
    "photo-1535632066922-abd09999a012",
    "photo-1573408301185-9146fe634ad0",
  ];

  const MODE_HERO_IDS = [
    "photo-1445207750230-853bccd1e0b0",
    "photo-1469334031218-e382a71b716b",
    "photo-1490481651871-ab68de25d43d",
    "photo-1483985988354-763728e1935b",
  ];
  const MODE_DETAIL_IDS = [
    "photo-1434389677669-e08b4cac3105",
    "photo-1445207750230-853bccd1e0b0",
    "photo-1469334031218-e382a71b716b",
    "photo-1490481651871-ab68de25d43d",
  ];

  function urlsFromIds(ids, w, h) {
    return ids.map(function (id) {
      return u(id, w, h);
    });
  }

  function pickCarpenterHeroUrl(opts) {
    opts = opts || {};
    const salt = opts.nonce != null ? opts.nonce : Date.now() + Math.random();
    const i = simpleHash("snickare|hero|" + String(salt)) % SNICKARE_HERO_IDS.length;
    return u(SNICKARE_HERO_IDS[i], 1920, 1080);
  }

  function pickElectricianHeroUrl(opts) {
    opts = opts || {};
    const salt = opts.nonce != null ? opts.nonce : Date.now() + Math.random();
    const i = simpleHash("elektriker|hero|" + String(salt)) % ELEKTRIKER_HERO_IDS.length;
    return u(ELEKTRIKER_HERO_IDS[i], 1920, 1080);
  }

  function normalizeTemplate(t) {
    const r = (t || "editorial").trim();
    const leg = {
      "modern-agency": "editorial",
      "minimal-portfolio": "swiss-grid",
      event: "landmark",
      restaurant: "atelier",
      "neo-brutal": "landmark",
    };
    const x = leg[r] || r;
    const ok = new Set(["editorial", "atelier", "swiss-grid", "luxury-brand", "landmark"]);
    return ok.has(x) ? x : "editorial";
  }

  /** editorial + atelier → mjuk · luxury → premium mörkare · swiss + landmark → skarp geometri */
  function moodForTemplate(template) {
    const t = normalizeTemplate(template);
    if (t === "luxury-brand") return "lux";
    if (t === "swiss-grid" || t === "landmark") return "sharp";
    return "soft";
  }

  /** @typedef {{ hero: string[]; about: string; cards: string[]; gallery: string[] }} VisualPack */

  /** @type {Record<string, Record<"soft"|"lux"|"sharp", VisualPack>>} */
  const STOCK = {
    frisor: {
      soft: {
        hero: [
          u("photo-1560066984-138dadb4c035", 1920, 1080),
          u("photo-1595476102220-bdb087b80fc4", 1920, 1080),
          u("photo-1522337360788-8b13dee7a37e", 1920, 1080),
        ],
        about: u("photo-1562322140-23b3bdf7d2b2", 800, 1000),
        cards: [
          u("photo-1503951914875-452162bee0ad", 720, 480),
          u("photo-1522338140214-fd0a7159295e", 720, 480),
          u("photo-1519699047748-de8e457a4041", 720, 480),
        ],
        gallery: [
          u("photo-1521590832167-7bcbfaa6381f", 900, 700),
          u("photo-1633681926022-844d7d659b83", 900, 700),
          u("photo-1560066984-138dadb4c035", 900, 700),
          u("photo-1516975080664-b2e8168669ca", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1521590832167-7bcbfaa6381f", 1920, 1080),
          u("photo-1519699047748-de8e457a4041", 1920, 1080),
          u("photo-1503951914875-452162bee0ad", 1920, 1080),
        ],
        about: u("photo-1633681926022-844d7d659b83", 800, 1000),
        cards: [
          u("photo-1522337360788-8b13dee7a37e", 720, 480),
          u("photo-1595476102220-bdb087b80fc4", 720, 480),
          u("photo-1516975080664-b2e8168669ca", 720, 480),
        ],
        gallery: [
          u("photo-1503951914875-452162bee0ad", 900, 700),
          u("photo-1522338140214-fd0a7159295e", 900, 700),
          u("photo-1560066984-138dadb4c035", 900, 700),
          u("photo-1595476102220-bdb087b80fc4", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1633681926022-844d7d659b83", 1920, 1080),
          u("photo-1516975080664-b2e8168669ca", 1920, 1080),
          u("photo-1527799820374-dcf8d4d08888", 1920, 1080),
        ],
        about: u("photo-1522338140214-fd0a7159295e", 800, 1000),
        cards: [
          u("photo-1633681926022-844d7d659b83", 720, 480),
          u("photo-1516975080664-b2e8168669ca", 720, 480),
          u("photo-1527799820374-dcf8d4d08888", 720, 480),
        ],
        gallery: [
          u("photo-1527799820374-dcf8d4d08888", 900, 700),
          u("photo-1633681926022-844d7d659b83", 900, 700),
          u("photo-1516975080664-b2e8168669ca", 900, 700),
          u("photo-1522338140214-fd0a7159295e", 900, 700),
        ],
      },
    },
    hundsalong: {
      soft: {
        hero: [
          u("photo-1583511655857-d19b40a7a54e", 1920, 1080),
          u("photo-1552053831-71594a27632d", 1920, 1080),
          u("photo-1587300003388-59208cc962cb", 1920, 1080),
        ],
        about: u("photo-1548199973-03cce0bbc87b", 800, 1000),
        cards: [
          u("photo-1530281700549-e82e7bf010d6", 720, 480),
          u("photo-1517849845537-4d257902454a", 720, 480),
          u("photo-1583337130417-3346a1be7dee", 720, 480),
        ],
        gallery: [
          u("photo-1583511655857-d19b40a7a54e", 900, 700),
          u("photo-1552053831-71594a27632d", 900, 700),
          u("photo-1587300003388-59208cc962cb", 900, 700),
          u("photo-1548199973-03cce0bbc87b", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1518717758536-85ae2900b2c2", 1920, 1080),
          u("photo-1583511655857-d19b40a7a54e", 1920, 1080),
          u("photo-1530281700549-e82e7bf010d6", 1920, 1080),
        ],
        about: u("photo-1518717758536-85ae2900b2c2", 800, 1000),
        cards: [
          u("photo-1583511655857-d19b40a7a54e", 720, 480),
          u("photo-1552053831-71594a27632d", 720, 480),
          u("photo-1517849845537-4d257902454a", 720, 480),
        ],
        gallery: [
          u("photo-1518717758536-85ae2900b2c2", 900, 700),
          u("photo-1530281700549-e82e7bf010d6", 900, 700),
          u("photo-1583337130417-3346a1be7dee", 900, 700),
          u("photo-1587300003388-59208cc962cb", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1530281700549-e82e7bf010d6", 1920, 1080),
          u("photo-1583337130417-3346a1be7dee", 1920, 1080),
          u("photo-1548199973-03cce0bbc87b", 1920, 1080),
        ],
        about: u("photo-1583337130417-3346a1be7dee", 800, 1000),
        cards: [
          u("photo-1530281700549-e82e7bf010d6", 720, 480),
          u("photo-1583337130417-3346a1be7dee", 720, 480),
          u("photo-1548199973-03cce0bbc87b", 720, 480),
        ],
        gallery: [
          u("photo-1530281700549-e82e7bf010d6", 900, 700),
          u("photo-1583337130417-3346a1be7dee", 900, 700),
          u("photo-1548199973-03cce0bbc87b", 900, 700),
          u("photo-1517849845537-4d257902454a", 900, 700),
        ],
      },
    },
    cafe: {
      soft: {
        hero: [
          u("photo-1495474472207-661b0b3d3b4b", 1920, 1080),
          u("photo-1509042239860-f550ce710b93", 1920, 1080),
          u("photo-1442512595331-e89e73853f31", 1920, 1080),
        ],
        about: u("photo-1445116572660-2360993d23cb", 800, 1000),
        cards: [
          u("photo-1509042239860-f550ce710b93", 720, 480),
          u("photo-1495474472207-661b0b3d3b4b", 720, 480),
          u("photo-1554118811-1e0d58224f24", 720, 480),
        ],
        gallery: [
          u("photo-1509042239860-f550ce710b93", 900, 700),
          u("photo-1554118811-1e0d58224f24", 900, 700),
          u("photo-1442512595331-e89e73853f31", 900, 700),
          u("photo-1445116572660-2360993d23cb", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1554118811-1e0d58224f24", 1920, 1080),
          u("photo-1445116572660-2360993d23cb", 1920, 1080),
          u("photo-1424847651672-bf20a0b8712a", 1920, 1080),
        ],
        about: u("photo-1424847651672-bf20a0b8712a", 800, 1000),
        cards: [
          u("photo-1445116572660-2360993d23cb", 720, 480),
          u("photo-1554118811-1e0d58224f24", 720, 480),
          u("photo-1424847651672-bf20a0b8712a", 720, 480),
        ],
        gallery: [
          u("photo-1424847651672-bf20a0b8712a", 900, 700),
          u("photo-1445116572660-2360993d23cb", 900, 700),
          u("photo-1554118811-1e0d58224f24", 900, 700),
          u("photo-1495474472207-661b0b3d3b4b", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1442512595331-e89e73853f31", 1920, 1080),
          u("photo-1554118811-1e0d58224f24", 1920, 1080),
          u("photo-1509042239860-f550ce710b93", 1920, 1080),
        ],
        about: u("photo-1554118811-1e0d58224f24", 800, 1000),
        cards: [
          u("photo-1442512595331-e89e73853f31", 720, 480),
          u("photo-1554118811-1e0d58224f24", 720, 480),
          u("photo-1509042239860-f550ce710b93", 720, 480),
        ],
        gallery: [
          u("photo-1442512595331-e89e73853f31", 900, 700),
          u("photo-1554118811-1e0d58224f24", 900, 700),
          u("photo-1509042239860-f550ce710b93", 900, 700),
          u("photo-1495474472207-661b0b3d3b4b", 900, 700),
        ],
      },
    },
    byggfirma: {
      soft: {
        hero: urlsFromIds(SNICKARE_HERO_IDS, 1920, 1080),
        about: u("photo-1541753866382-081a052f842a", 800, 1000),
        cards: urlsFromIds(SNICKARE_HERO_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(SNICKARE_HERO_IDS, 900, 700),
      },
      lux: {
        hero: urlsFromIds(SNICKARE_HERO_IDS, 1920, 1080),
        about: u("photo-1530126523779-a94d246beee0", 800, 1000),
        cards: urlsFromIds(SNICKARE_HERO_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(SNICKARE_HERO_IDS, 900, 700),
      },
      sharp: {
        hero: urlsFromIds(SNICKARE_HERO_IDS, 1920, 1080),
        about: u("photo-1503387762-592deb58ef4e", 800, 1000),
        cards: urlsFromIds(SNICKARE_HERO_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(SNICKARE_HERO_IDS, 900, 700),
      },
    },
    elektriker: {
      soft: {
        hero: urlsFromIds(ELEKTRIKER_HERO_IDS, 1920, 1080),
        about: u("photo-1581092160562-40aa08e78837", 800, 1000),
        cards: urlsFromIds(ELEKTRIKER_HERO_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(ELEKTRIKER_HERO_IDS, 900, 700),
      },
      lux: {
        hero: urlsFromIds(ELEKTRIKER_HERO_IDS, 1920, 1080),
        about: u("photo-1621905252507-b7627934c31d", 800, 1000),
        cards: urlsFromIds(ELEKTRIKER_HERO_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(ELEKTRIKER_HERO_IDS, 900, 700),
      },
      sharp: {
        hero: urlsFromIds(ELEKTRIKER_HERO_IDS, 1920, 1080),
        about: u("photo-1558618666-fcd25c85cd64", 800, 1000),
        cards: urlsFromIds(ELEKTRIKER_HERO_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(ELEKTRIKER_HERO_IDS, 900, 700),
      },
    },
    fotograf: {
      soft: {
        hero: [
          u("photo-1452587925148-ce544e77e70d", 1920, 1080),
          u("photo-1516035069371-29a1b244ccff", 1920, 1080),
          u("photo-1493863641943-9b68992a8d28", 1920, 1080),
        ],
        about: u("photo-1516035069371-29a1b244ccff", 800, 1000),
        cards: [
          u("photo-1452587925148-ce544e77e70d", 720, 480),
          u("photo-1516035069371-29a1b244ccff", 720, 480),
          u("photo-1493863641943-9b68992a8d28", 720, 480),
        ],
        gallery: [
          u("photo-1452587925148-ce544e77e70d", 900, 700),
          u("photo-1516035069371-29a1b244ccff", 900, 700),
          u("photo-1493863641943-9b68992a8d28", 900, 700),
          u("photo-1506905925346-21bda4d32df4", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1506905925346-21bda4d32df4", 1920, 1080),
          u("photo-1452587925148-ce544e77e70d", 1920, 1080),
          u("photo-1516035069371-29a1b244ccff", 1920, 1080),
        ],
        about: u("photo-1506905925346-21bda4d32df4", 800, 1000),
        cards: [
          u("photo-1506905925346-21bda4d32df4", 720, 480),
          u("photo-1452587925148-ce544e77e70d", 720, 480),
          u("photo-1516035069371-29a1b244ccff", 720, 480),
        ],
        gallery: [
          u("photo-1506905925346-21bda4d32df4", 900, 700),
          u("photo-1452587925148-ce544e77e70d", 900, 700),
          u("photo-1516035069371-29a1b244ccff", 900, 700),
          u("photo-1493863641943-9b68992a8d28", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1493863641943-9b68992a8d28", 1920, 1080),
          u("photo-1516035069371-29a1b244ccff", 1920, 1080),
          u("photo-1452587925148-ce544e77e70d", 1920, 1080),
        ],
        about: u("photo-1493863641943-9b68992a8d28", 800, 1000),
        cards: [
          u("photo-1493863641943-9b68992a8d28", 720, 480),
          u("photo-1516035069371-29a1b244ccff", 720, 480),
          u("photo-1452587925148-ce544e77e70d", 720, 480),
        ],
        gallery: [
          u("photo-1493863641943-9b68992a8d28", 900, 700),
          u("photo-1516035069371-29a1b244ccff", 900, 700),
          u("photo-1452587925148-ce544e77e70d", 900, 700),
          u("photo-1506905925346-21bda4d32df4", 900, 700),
        ],
      },
    },
    event: {
      soft: {
        hero: [
          u("photo-1511578314322-379afb476865", 1920, 1080),
          u("photo-1464366400600-7198d0af96fd", 1920, 1080),
          u("photo-1429960358163-88f91de7ef01", 1920, 1080),
        ],
        about: u("photo-1464366400600-7198d0af96fd", 800, 1000),
        cards: [
          u("photo-1511578314322-379afb476865", 720, 480),
          u("photo-1464366400600-7198d0af96fd", 720, 480),
          u("photo-1429960358163-88f91de7ef01", 720, 480),
        ],
        gallery: [
          u("photo-1511578314322-379afb476865", 900, 700),
          u("photo-1464366400600-7198d0af96fd", 900, 700),
          u("photo-1429960358163-88f91de7ef01", 900, 700),
          u("photo-1429960358163-88f91de7ef01", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1429960358163-88f91de7ef01", 1920, 1080),
          u("photo-1511578314322-379afb476865", 1920, 1080),
          u("photo-1470225620780-dba8ba162b59", 1920, 1080),
        ],
        about: u("photo-1470225620780-dba8ba162b59", 800, 1000),
        cards: [
          u("photo-1429960358163-88f91de7ef01", 720, 480),
          u("photo-1511578314322-379afb476865", 720, 480),
          u("photo-1470225620780-dba8ba162b59", 720, 480),
        ],
        gallery: [
          u("photo-1470225620780-dba8ba162b59", 900, 700),
          u("photo-1429960358163-88f91de7ef01", 900, 700),
          u("photo-1511578314322-379afb476865", 900, 700),
          u("photo-1464366400600-7198d0af96fd", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1470225620780-dba8ba162b59", 1920, 1080),
          u("photo-1429960358163-88f91de7ef01", 1920, 1080),
          u("photo-1464366400600-7198d0af96fd", 1920, 1080),
        ],
        about: u("photo-1429960358163-88f91de7ef01", 800, 1000),
        cards: [
          u("photo-1470225620780-dba8ba162b59", 720, 480),
          u("photo-1429960358163-88f91de7ef01", 720, 480),
          u("photo-1464366400600-7198d0af96fd", 720, 480),
        ],
        gallery: [
          u("photo-1470225620780-dba8ba162b59", 900, 700),
          u("photo-1429960358163-88f91de7ef01", 900, 700),
          u("photo-1464366400600-7198d0af96fd", 900, 700),
          u("photo-1511578314322-379afb476865", 900, 700),
        ],
      },
    },
    restaurang: {
      soft: {
        hero: [
          u("photo-1517248135467-4c7edcad34c4", 1920, 1080),
          u("photo-1414235077428-338989a2e8c0", 1920, 1080),
          u("photo-1555396273-367ea4eb4db5", 1920, 1080),
        ],
        about: u("photo-1555396273-367ea4eb4db5", 800, 1000),
        cards: [
          u("photo-1517248135467-4c7edcad34c4", 720, 480),
          u("photo-1414235077428-338989a2e8c0", 720, 480),
          u("photo-1555396273-367ea4eb4db5", 720, 480),
        ],
        gallery: [
          u("photo-1517248135467-4c7edcad34c4", 900, 700),
          u("photo-1414235077428-338989a2e8c0", 900, 700),
          u("photo-1555396273-367ea4eb4db5", 900, 700),
          u("photo-1559339352-11d035aa65de", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1559339352-11d035aa65de", 1920, 1080),
          u("photo-1517248135467-4c7edcad34c4", 1920, 1080),
          u("photo-1424847651672-bf20a0b8712a", 1920, 1080),
        ],
        about: u("photo-1559339352-11d035aa65de", 800, 1000),
        cards: [
          u("photo-1559339352-11d035aa65de", 720, 480),
          u("photo-1517248135467-4c7edcad34c4", 720, 480),
          u("photo-1414235077428-338989a2e8c0", 720, 480),
        ],
        gallery: [
          u("photo-1559339352-11d035aa65de", 900, 700),
          u("photo-1517248135467-4c7edcad34c4", 900, 700),
          u("photo-1414235077428-338989a2e8c0", 900, 700),
          u("photo-1555396273-367ea4eb4db5", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1414235077428-338989a2e8c0", 1920, 1080),
          u("photo-1555396273-367ea4eb4db5", 1920, 1080),
          u("photo-1517248135467-4c7edcad34c4", 1920, 1080),
        ],
        about: u("photo-1414235077428-338989a2e8c0", 800, 1000),
        cards: [
          u("photo-1414235077428-338989a2e8c0", 720, 480),
          u("photo-1555396273-367ea4eb4db5", 720, 480),
          u("photo-1517248135467-4c7edcad34c4", 720, 480),
        ],
        gallery: [
          u("photo-1414235077428-338989a2e8c0", 900, 700),
          u("photo-1555396273-367ea4eb4db5", 900, 700),
          u("photo-1517248135467-4c7edcad34c4", 900, 700),
          u("photo-1559339352-11d035aa65de", 900, 700),
        ],
      },
    },
    konsult: {
      soft: {
        hero: [
          u("photo-1497366212358-3750dddfa03e", 1920, 1080),
          u("photo-1522071820081-009f0129c71c", 1920, 1080),
          u("photo-1552664730-d307ca884978", 1920, 1080),
        ],
        about: u("photo-1522071820081-009f0129c71c", 800, 1000),
        cards: [
          u("photo-1552664730-d307ca884978", 720, 480),
          u("photo-1553877522-43269d4ea984", 720, 480),
          u("photo-1454165804606-c3d57bc86b40", 720, 480),
        ],
        gallery: [
          u("photo-1497366212358-3750dddfa03e", 900, 700),
          u("photo-1522071820081-009f0129c71c", 900, 700),
          u("photo-1552664730-d307ca884978", 900, 700),
          u("photo-1454165804606-c3d57bc86b40", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1486406146926-c627a92ad1ab", 1920, 1080),
          u("photo-1560179707-f14e90ef3623", 1920, 1080),
          u("photo-1497366811353-6870744d04b8", 1920, 1080),
        ],
        about: u("photo-1486406146926-c627a92ad1ab", 800, 1000),
        cards: [
          u("photo-1486406146926-c627a92ad1ab", 720, 480),
          u("photo-1560179707-f14e90ef3623", 720, 480),
          u("photo-1497366811353-6870744d04b8", 720, 480),
        ],
        gallery: [
          u("photo-1486406146926-c627a92ad1ab", 900, 700),
          u("photo-1560179707-f14e90ef3623", 900, 700),
          u("photo-1497366811353-6870744d04b8", 900, 700),
          u("photo-1522071820081-009f0129c71c", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1497366811353-6870744d04b8", 1920, 1080),
          u("photo-1497366754035-f200968a6e72", 1920, 1080),
          u("photo-1497215728101-856f4ea42174", 1920, 1080),
        ],
        about: u("photo-1497366811353-6870744d04b8", 800, 1000),
        cards: [
          u("photo-1497366811353-6870744d04b8", 720, 480),
          u("photo-1497366754035-f200968a6e72", 720, 480),
          u("photo-1497215728101-856f4ea42174", 720, 480),
        ],
        gallery: [
          u("photo-1497366811353-6870744d04b8", 900, 700),
          u("photo-1497366754035-f200968a6e72", 900, 700),
          u("photo-1497215728101-856f4ea42174", 900, 700),
          u("photo-1522071820081-009f0129c71c", 900, 700),
        ],
      },
    },
    verksamhet: {
      soft: {
        hero: [
          u("photo-1497366212358-3750dddfa03e", 1920, 1080),
          u("photo-1542601906994-b5d5fb29d4d9", 1920, 1080),
          u("photo-1473341304170-971dccb5ac71", 1920, 1080),
        ],
        about: u("photo-1522071820081-009f0129c71c", 800, 1000),
        cards: [
          u("photo-1552664730-d307ca884978", 720, 480),
          u("photo-1542601906994-b5d5fb29d4d9", 720, 480),
          u("photo-1473341304170-971dccb5ac71", 720, 480),
        ],
        gallery: [
          u("photo-1497366212358-3750dddfa03e", 900, 700),
          u("photo-1542601906994-b5d5fb29d4d9", 900, 700),
          u("photo-1473341304170-971dccb5ac71", 900, 700),
          u("photo-1522071820081-009f0129c71c", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1486406146926-c627a92ad1ab", 1920, 1080),
          u("photo-1473341304170-971dccb5ac71", 1920, 1080),
          u("photo-1497366212358-3750dddfa03e", 1920, 1080),
        ],
        about: u("photo-1486406146926-c627a92ad1ab", 800, 1000),
        cards: [
          u("photo-1486406146926-c627a92ad1ab", 720, 480),
          u("photo-1473341304170-971dccb5ac71", 720, 480),
          u("photo-1542601906994-b5d5fb29d4d9", 720, 480),
        ],
        gallery: [
          u("photo-1486406146926-c627a92ad1ab", 900, 700),
          u("photo-1473341304170-971dccb5ac71", 900, 700),
          u("photo-1542601906994-b5d5fb29d4d9", 900, 700),
          u("photo-1497366212358-3750dddfa03e", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1497366754035-f200968a6e72", 1920, 1080),
          u("photo-1542601906994-b5d5fb29d4d9", 1920, 1080),
          u("photo-1522071820081-009f0129c71c", 1920, 1080),
        ],
        about: u("photo-1497366754035-f200968a6e72", 800, 1000),
        cards: [
          u("photo-1497366754035-f200968a6e72", 720, 480),
          u("photo-1542601906994-b5d5fb29d4d9", 720, 480),
          u("photo-1473341304170-971dccb5ac71", 720, 480),
        ],
        gallery: [
          u("photo-1497366754035-f200968a6e72", 900, 700),
          u("photo-1542601906994-b5d5fb29d4d9", 900, 700),
          u("photo-1473341304170-971dccb5ac71", 900, 700),
          u("photo-1522071820081-009f0129c71c", 900, 700),
        ],
      },
    },
    miljo: {
      soft: {
        hero: [
          u("photo-1532996122724-e792c0e698ab", 1920, 1080),
          u("photo-1569163139394-2a1a8915a7a8", 1920, 1080),
          u("photo-1611280615850-5f43c7a0a7c8", 1920, 1080),
        ],
        about: u("photo-1569163139394-2a1a8915a7a8", 800, 1000),
        cards: [
          u("photo-1532996122724-e792c0e698ab", 720, 480),
          u("photo-1569163139394-2a1a8915a7a8", 720, 480),
          u("photo-1611280615850-5f43c7a0a7c8", 720, 480),
        ],
        gallery: [
          u("photo-1532996122724-e792c0e698ab", 900, 700),
          u("photo-1569163139394-2a1a8915a7a8", 900, 700),
          u("photo-1611280615850-5f43c7a0a7c8", 900, 700),
          u("photo-1532996122724-e792c0e698ab", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1611280615850-5f43c7a0a7c8", 1920, 1080),
          u("photo-1532996122724-e792c0e698ab", 1920, 1080),
          u("photo-1569163139394-2a1a8915a7a8", 1920, 1080),
        ],
        about: u("photo-1611280615850-5f43c7a0a7c8", 800, 1000),
        cards: [
          u("photo-1611280615850-5f43c7a0a7c8", 720, 480),
          u("photo-1569163139394-2a1a8915a7a8", 720, 480),
          u("photo-1532996122724-e792c0e698ab", 720, 480),
        ],
        gallery: [
          u("photo-1611280615850-5f43c7a0a7c8", 900, 700),
          u("photo-1569163139394-2a1a8915a7a8", 900, 700),
          u("photo-1532996122724-e792c0e698ab", 900, 700),
          u("photo-1611280615850-5f43c7a0a7c8", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1569163139394-2a1a8915a7a8", 1920, 1080),
          u("photo-1611280615850-5f43c7a0a7c8", 1920, 1080),
          u("photo-1532996122724-e792c0e698ab", 1920, 1080),
        ],
        about: u("photo-1569163139394-2a1a8915a7a8", 800, 1000),
        cards: [
          u("photo-1569163139394-2a1a8915a7a8", 720, 480),
          u("photo-1611280615850-5f43c7a0a7c8", 720, 480),
          u("photo-1532996122724-e792c0e698ab", 720, 480),
        ],
        gallery: [
          u("photo-1569163139394-2a1a8915a7a8", 900, 700),
          u("photo-1611280615850-5f43c7a0a7c8", 900, 700),
          u("photo-1532996122724-e792c0e698ab", 900, 700),
          u("photo-1569163139394-2a1a8915a7a8", 900, 700),
        ],
      },
    },
    baby: {
      soft: {
        hero: [
          u("photo-1519689680058-324335c77eba", 1920, 1080),
          u("photo-1522771930-78848d9293e8", 1920, 1080),
          u("photo-1602030028438-4cf153cbae9e", 1920, 1080),
        ],
        about: u("photo-1519689680058-324335c77eba", 800, 1000),
        cards: [
          u("photo-1522771930-78848d9293e8", 720, 480),
          u("photo-1602030028438-4cf153cbae9e", 720, 480),
          u("photo-1519689680058-324335c77eba", 720, 480),
        ],
        gallery: [
          u("photo-1519689680058-324335c77eba", 900, 700),
          u("photo-1522771930-78848d9293e8", 900, 700),
          u("photo-1602030028438-4cf153cbae9e", 900, 700),
          u("photo-1544126592-807ade215a0b", 900, 700),
        ],
      },
      lux: null,
      sharp: null,
    },
    inredning: {
      soft: {
        hero: urlsFromIds(INREDNING_HERO_IDS, 1920, 1080),
        about: u("photo-1615876238916-b4a8a64d5922", 800, 1000),
        cards: urlsFromIds(INREDNING_DETAIL_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(INREDNING_DETAIL_IDS, 900, 700),
      },
      lux: {
        hero: urlsFromIds(INREDNING_HERO_IDS.slice().reverse(), 1920, 1080),
        about: u("photo-1616047006789-d1775e875851", 800, 1000),
        cards: urlsFromIds(INREDNING_DETAIL_IDS.slice(1, 4), 720, 480),
        gallery: urlsFromIds(INREDNING_HERO_IDS.concat(INREDNING_DETAIL_IDS.slice(0, 2)), 900, 700),
      },
      sharp: {
        hero: urlsFromIds(INREDNING_HERO_IDS.slice(2).concat(INREDNING_HERO_IDS.slice(0, 2)), 1920, 1080),
        about: u("photo-1555041469-a586c61ea9bc", 800, 1000),
        cards: urlsFromIds(INREDNING_DETAIL_IDS.slice(2).concat(INREDNING_DETAIL_IDS.slice(0, 1)), 720, 480),
        gallery: urlsFromIds(INREDNING_DETAIL_IDS.slice(2).concat(INREDNING_HERO_IDS.slice(0, 2)), 900, 700),
      },
    },
    smycken: {
      soft: {
        hero: urlsFromIds(SMYCKEN_HERO_IDS, 1920, 1080),
        about: u("photo-1515562141207-021a0649a33c", 800, 1000),
        cards: urlsFromIds(SMYCKEN_DETAIL_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(SMYCKEN_DETAIL_IDS, 900, 700),
      },
      lux: {
        hero: urlsFromIds(SMYCKEN_HERO_IDS.slice().reverse(), 1920, 1080),
        about: u("photo-1611596839882-674604be2c89", 800, 1000),
        cards: urlsFromIds(SMYCKEN_DETAIL_IDS.slice(1, 4), 720, 480),
        gallery: urlsFromIds(SMYCKEN_HERO_IDS.concat(SMYCKEN_DETAIL_IDS.slice(0, 2)), 900, 700),
      },
      sharp: {
        hero: urlsFromIds(SMYCKEN_HERO_IDS.slice(2).concat(SMYCKEN_HERO_IDS.slice(0, 2)), 1920, 1080),
        about: u("photo-1573408301185-9146fe634ad0", 800, 1000),
        cards: urlsFromIds(SMYCKEN_DETAIL_IDS.slice(2).concat(SMYCKEN_DETAIL_IDS.slice(0, 1)), 720, 480),
        gallery: urlsFromIds(SMYCKEN_DETAIL_IDS.slice(1).concat(SMYCKEN_HERO_IDS.slice(0, 2)), 900, 700),
      },
    },
    mode: {
      soft: {
        hero: urlsFromIds(MODE_HERO_IDS, 1920, 1080),
        about: u("photo-1445207750230-853bccd1e0b0", 800, 1000),
        cards: urlsFromIds(MODE_DETAIL_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(MODE_DETAIL_IDS, 900, 700),
      },
      lux: {
        hero: urlsFromIds(MODE_HERO_IDS.slice().reverse(), 1920, 1080),
        about: u("photo-1469334031218-e382a71b716b", 800, 1000),
        cards: urlsFromIds(MODE_DETAIL_IDS.slice(1, 4), 720, 480),
        gallery: urlsFromIds(MODE_HERO_IDS.concat(MODE_DETAIL_IDS.slice(0, 2)), 900, 700),
      },
      sharp: {
        hero: urlsFromIds(MODE_HERO_IDS.slice(2).concat(MODE_HERO_IDS.slice(0, 2)), 1920, 1080),
        about: u("photo-1490481651871-ab68de25d43d", 800, 1000),
        cards: urlsFromIds(MODE_DETAIL_IDS.slice(2).concat(MODE_DETAIL_IDS.slice(0, 1)), 720, 480),
        gallery: urlsFromIds(MODE_DETAIL_IDS.slice(1).concat(MODE_HERO_IDS.slice(0, 2)), 900, 700),
      },
    },
    butik: {
      soft: {
        hero: urlsFromIds(INREDNING_HERO_IDS, 1920, 1080),
        about: u("photo-1513885535751-8b9238b07182", 800, 1000),
        cards: urlsFromIds(INREDNING_DETAIL_IDS.slice(0, 3), 720, 480),
        gallery: urlsFromIds(INREDNING_DETAIL_IDS, 900, 700),
      },
      lux: {
        hero: urlsFromIds(INREDNING_HERO_IDS.slice().reverse(), 1920, 1080),
        about: u("photo-1484101403633-562891789754", 800, 1000),
        cards: urlsFromIds(INREDNING_DETAIL_IDS.slice(1, 4), 720, 480),
        gallery: urlsFromIds(INREDNING_HERO_IDS.concat(INREDNING_DETAIL_IDS.slice(0, 2)), 900, 700),
      },
      sharp: {
        hero: urlsFromIds(INREDNING_HERO_IDS.slice(2).concat(INREDNING_HERO_IDS.slice(0, 2)), 1920, 1080),
        about: u("photo-1543573868296-0618f4bd4a38", 800, 1000),
        cards: urlsFromIds(INREDNING_DETAIL_IDS.slice(2).concat(INREDNING_DETAIL_IDS.slice(0, 1)), 720, 480),
        gallery: urlsFromIds(INREDNING_DETAIL_IDS.slice(2).concat(INREDNING_HERO_IDS.slice(0, 2)), 900, 700),
      },
    },
    advokat: {
      soft: {
        hero: [
          u("photo-1589829545856-d10d557cf95f", 1920, 1080),
          u("photo-1505664194779-8beaceb93744", 1920, 1080),
          u("photo-1450101499163-c8848c66ca85", 1920, 1080),
        ],
        about: u("photo-1505664194779-8beaceb93744", 800, 1000),
        cards: [
          u("photo-1589829545856-d10d557cf95f", 720, 480),
          u("photo-1505664194779-8beaceb93744", 720, 480),
          u("photo-1450101499163-c8848c66ca85", 720, 480),
        ],
        gallery: [
          u("photo-1589829545856-d10d557cf95f", 900, 700),
          u("photo-1505664194779-8beaceb93744", 900, 700),
          u("photo-1450101499163-c8848c66ca85", 900, 700),
          u("photo-1454165804606-c3d57bc86b40", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1450101499163-c8848c66ca85", 1920, 1080),
          u("photo-1589829545856-d10d557cf95f", 1920, 1080),
          u("photo-1454165804606-c3d57bc86b40", 1920, 1080),
        ],
        about: u("photo-1450101499163-c8848c66ca85", 800, 1000),
        cards: [
          u("photo-1450101499163-c8848c66ca85", 720, 480),
          u("photo-1589829545856-d10d557cf95f", 720, 480),
          u("photo-1454165804606-c3d57bc86b40", 720, 480),
        ],
        gallery: [
          u("photo-1450101499163-c8848c66ca85", 900, 700),
          u("photo-1589829545856-d10d557cf95f", 900, 700),
          u("photo-1454165804606-c3d57bc86b40", 900, 700),
          u("photo-1505664194779-8beaceb93744", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1454165804606-c3d57bc86b40", 1920, 1080),
          u("photo-1589829545856-d10d557cf95f", 1920, 1080),
          u("photo-1450101499163-c8848c66ca85", 1920, 1080),
        ],
        about: u("photo-1454165804606-c3d57bc86b40", 800, 1000),
        cards: [
          u("photo-1454165804606-c3d57bc86b40", 720, 480),
          u("photo-1589829545856-d10d557cf95f", 720, 480),
          u("photo-1450101499163-c8848c66ca85", 720, 480),
        ],
        gallery: [
          u("photo-1454165804606-c3d57bc86b40", 900, 700),
          u("photo-1589829545856-d10d557cf95f", 900, 700),
          u("photo-1450101499163-c8848c66ca85", 900, 700),
          u("photo-1505664194779-8beaceb93744", 900, 700),
        ],
      },
    },
    gym: {
      soft: {
        hero: [
          u("photo-1544367567-0f2fcb009e0b", 1920, 1080),
          u("photo-1571902943202-507ec2618e8f", 1920, 1080),
          u("photo-1593079831268-3381b0ad4cc9", 1920, 1080),
        ],
        about: u("photo-1571902943202-507ec2618e8f", 800, 1000),
        cards: [
          u("photo-1544367567-0f2fcb009e0b", 720, 480),
          u("photo-1571902943202-507ec2618e8f", 720, 480),
          u("photo-1593079831268-3381b0ad4cc9", 720, 480),
        ],
        gallery: [
          u("photo-1544367567-0f2fcb009e0b", 900, 700),
          u("photo-1571902943202-507ec2618e8f", 900, 700),
          u("photo-1593079831268-3381b0ad4cc9", 900, 700),
          u("photo-1534438327276-14e5300c3a48", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1534438327276-14e5300c3a48", 1920, 1080),
          u("photo-1544367567-0f2fcb009e0b", 1920, 1080),
          u("photo-1517836357463-d25dfeac3438", 1920, 1080),
        ],
        about: u("photo-1534438327276-14e5300c3a48", 800, 1000),
        cards: [
          u("photo-1534438327276-14e5300c3a48", 720, 480),
          u("photo-1544367567-0f2fcb009e0b", 720, 480),
          u("photo-1517836357463-d25dfeac3438", 720, 480),
        ],
        gallery: [
          u("photo-1517836357463-d25dfeac3438", 900, 700),
          u("photo-1534438327276-14e5300c3a48", 900, 700),
          u("photo-1544367567-0f2fcb009e0b", 900, 700),
          u("photo-1571902943202-507ec2618e8f", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1517836357463-d25dfeac3438", 1920, 1080),
          u("photo-1593079831268-3381b0ad4cc9", 1920, 1080),
          u("photo-1571902943202-507ec2618e8f", 1920, 1080),
        ],
        about: u("photo-1517836357463-d25dfeac3438", 800, 1000),
        cards: [
          u("photo-1517836357463-d25dfeac3438", 720, 480),
          u("photo-1593079831268-3381b0ad4cc9", 720, 480),
          u("photo-1571902943202-507ec2618e8f", 720, 480),
        ],
        gallery: [
          u("photo-1517836357463-d25dfeac3438", 900, 700),
          u("photo-1593079831268-3381b0ad4cc9", 900, 700),
          u("photo-1571902943202-507ec2618e8f", 900, 700),
          u("photo-1544367567-0f2fcb009e0b", 900, 700),
        ],
      },
    },
    tarot: {
      soft: {
        hero: [
          u("photo-1507003211169-0e0290296852", 1920, 1080),
          u("photo-1518192516457-3e870368d0d8", 1920, 1080),
          u("photo-1545389336-cf090694435e", 1920, 1080),
        ],
        about: u("photo-1518192516457-3e870368d0d8", 800, 1000),
        cards: [
          u("photo-1532619675605-1d608e0a1f9a", 720, 480),
          u("photo-1518709268805-4e9042af2176", 720, 480),
          u("photo-1507003211169-0e0290296852", 720, 480),
        ],
        gallery: [
          u("photo-1532619675605-1d608e0a1f9a", 900, 700),
          u("photo-1518709268805-4e9042af2176", 900, 700),
          u("photo-1545389336-cf090694435e", 900, 700),
          u("photo-1518192516457-3e870368d0d8", 900, 700),
        ],
      },
      lux: {
        hero: [
          u("photo-1532619675605-1d608e0a1f9a", 1920, 1080),
          u("photo-1518709268805-4e9042af2176", 1920, 1080),
          u("photo-1545389336-cf090694435e", 1920, 1080),
        ],
        about: u("photo-1532619675605-1d608e0a1f9a", 800, 1000),
        cards: [
          u("photo-1518709268805-4e9042af2176", 720, 480),
          u("photo-1518192516457-3e870368d0d8", 720, 480),
          u("photo-1507003211169-0e0290296852", 720, 480),
        ],
        gallery: [
          u("photo-1532619675605-1d608e0a1f9a", 900, 700),
          u("photo-1518709268805-4e9042af2176", 900, 700),
          u("photo-1518192516457-3e870368d0d8", 900, 700),
          u("photo-1507003211169-0e0290296852", 900, 700),
        ],
      },
      sharp: {
        hero: [
          u("photo-1545389336-cf090694435e", 1920, 1080),
          u("photo-1532619675605-1d608e0a1f9a", 1920, 1080),
          u("photo-1518709268805-4e9042af2176", 1920, 1080),
        ],
        about: u("photo-1518709268805-4e9042af2176", 800, 1000),
        cards: [
          u("photo-1545389336-cf090694435e", 720, 480),
          u("photo-1532619675605-1d608e0a1f9a", 720, 480),
          u("photo-1518192516457-3e870368d0d8", 720, 480),
        ],
        gallery: [
          u("photo-1545389336-cf090694435e", 900, 700),
          u("photo-1532619675605-1d608e0a1f9a", 900, 700),
          u("photo-1518709268805-4e9042af2176", 900, 700),
          u("photo-1507003211169-0e0290296852", 900, 700),
        ],
      },
    },
  };

  function resolvePack(industry, template) {
    const mood = moodForTemplate(template);
    let ind = industry && STOCK[industry] ? industry : "konsult";
    if (ind === "konsult" && industry === "hunddagis" && STOCK.hundsalong) ind = "hundsalong";
    if (industry === "smycken" && STOCK.smycken) ind = "smycken";
    else if (industry === "baby" && STOCK.baby) ind = "baby";
    else if (industry === "mode" && STOCK.mode) ind = "mode";
    else if ((industry === "butik" || industry === "inredning" || industry === "webbutik") && STOCK.inredning) ind = "inredning";
    if (industry === "salong" && STOCK.cafe) ind = "cafe";
    if (industry === "portfolio" && STOCK.konsult) ind = "konsult";
    if (industry === "restaurang" && STOCK.restaurang) ind = "restaurang";
    const set = STOCK[ind];
    const pack = set[mood] || set.soft;
    const fallback = STOCK.konsult[mood] || STOCK.konsult.soft;
    if (!pack) return fallback;
    return pack;
  }

  function picsumFallback(kind, salt) {
    const dim =
      kind === "hero" ? "1920/1080" : kind === "about" ? "800/900" : kind === "card" ? "640/400" : "800/600";
    const enc = encodeURIComponent("fb-" + kind + "-" + String(salt));
    return "https://picsum.photos/seed/" + enc + "/" + dim;
  }

  /**
   * @param {"hero"|"about"|"card"|"gallery"} kind
   * @param {string} industry
   * @param {string} template
   * @param {{ nonce?: number|string; cardIndex?: number; galleryIndex?: number }} [opts]
   */
  function pickUrl(kind, industry, template, opts) {
    opts = opts || {};
    const ISE = global.ImageSelectionEngine;
    if (ISE && typeof ISE.pick === "function") {
      const SS = global.SiteState;
      const doc =
        SS && SS.get
          ? SS.get()
          : {
              page: { industry: industry || "konsult", template: template || "editorial" },
              sections: {},
            };
      return ISE.pick(doc, {
        section: kind,
        industry: industry,
        template: template,
        cardIndex: opts.cardIndex,
        galleryIndex: opts.galleryIndex,
        nonce: opts.nonce,
      });
    }
    const pack = resolvePack(industry || "konsult", template);
    const salt = opts.nonce != null ? opts.nonce : Date.now();
    try {
      if (kind === "hero") {
        if (industry === "byggfirma") return pickCarpenterHeroUrl(opts);
        if (industry === "elektriker") return pickElectricianHeroUrl(opts);
        const arr = pack.hero || [];
        if (!arr.length) throw new Error();
        const i = simpleHash(industry + moodForTemplate(template) + String(salt)) % arr.length;
        return arr[i];
      }
      if (kind === "about") return pack.about || picsumFallback("about", salt);
      if (kind === "card") {
        const arr = pack.cards || [];
        if (!arr.length) throw new Error();
        const ci = Number(opts.cardIndex) || 0;
        const i = simpleHash(String(salt) + "|c" + ci) % arr.length;
        return arr[i];
      }
      if (kind === "gallery") {
        const arr = pack.gallery || [];
        if (!arr.length) throw new Error();
        const gi = Number(opts.galleryIndex) >= 0 ? opts.galleryIndex : 0;
        const i = simpleHash(String(salt) + "|g" + gi) % arr.length;
        return arr[i];
      }
    } catch (e) {
      /* fall through */
    }
    return picsumFallback(kind, salt);
  }

  function defaultsFor(industry, template) {
    const ISE = global.ImageSelectionEngine;
    if (ISE && typeof ISE.defaultsFor === "function") {
      return ISE.defaultsFor(industry, template);
    }
    const pack = resolvePack(industry || "konsult", template);
    return {
      heroBgUrl: (pack.hero && pack.hero[0]) || picsumFallback("hero", "def"),
      about: pack.about || picsumFallback("about", "def"),
      cards: (pack.cards || []).slice(0, 3),
      gallery: (pack.gallery || []).slice(0, 4),
    };
  }

  function isPlaceholderStock(url) {
    const u = String(url || "").trim().toLowerCase();
    return !u || u.includes("picsum.photos");
  }

  /**
   * Bilder vi själva styr (säkra att byta vid branschval): tomt, picsum eller Unsplash-stock.
   * Riktiga användaruppladdningar (data:, blob: eller annan värd) returnerar false → behålls.
   */
  function isManagedStock(url) {
    const u = String(url || "").trim().toLowerCase();
    if (!u) return true;
    return u.includes("picsum.photos") || u.includes("images.unsplash.com");
  }

  /**
   * Applicera bilder vid t.ex. onboarding — rör inte användaruppladdade / ogiltliga URL:er.
   * @param {object} doc
   * @param {{ replaceStock?: boolean }} [opts] replaceStock=true byter även befintlig stock
   *   (annan branschs bilder) mot vald bransch — används vid onboarding/full generering.
   */
  function applyToDocument(doc, opts) {
    const ISE = global.ImageSelectionEngine;
    if (ISE && typeof ISE.applyToDocument === "function") {
      return ISE.applyToDocument(doc, opts);
    }
    if (!doc || !doc.page) return;
    const replaceStock = !!(opts && opts.replaceStock);
    const shouldReplace = replaceStock ? isManagedStock : isPlaceholderStock;
    const ind = doc.page.industry || "konsult";
    const tpl = doc.page.template || "editorial";
    const d = defaultsFor(ind, tpl);
    if (shouldReplace(doc.page.heroBgUrl)) doc.page.heroBgUrl = d.heroBgUrl;
    if (doc.sections && doc.sections.about && shouldReplace(doc.sections.about.imageUrl)) {
      doc.sections.about.imageUrl = d.about;
    }
    const cards = doc.sections && doc.sections.services && doc.sections.services.cards;
    if (Array.isArray(cards) && d.cards) {
      for (let i = 0; i < Math.min(3, cards.length, d.cards.length); i++) {
        if (cards[i] && shouldReplace(cards[i].img)) cards[i].img = d.cards[i];
      }
    }
    const imgs = doc.sections && doc.sections.gallery && doc.sections.gallery.images;
    if (Array.isArray(imgs) && d.gallery) {
      for (let i = 0; i < Math.min(4, imgs.length, d.gallery.length); i++) {
        if (shouldReplace(imgs[i])) imgs[i] = d.gallery[i];
      }
    }
  }

  function normalizeThemeText(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/å/g, "a")
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .normalize("NFD")
      .replace(/\u0300-\u036f/g, "")
      .replace(/\s+/g, " ");
  }

  /** Fri bildtema i chatten — t.ex. «bild med katter». */
  const IMAGE_THEME_HINTS = [
    { id: "cats", label: "katter", terms: ["katt", "katter", "kattunge", "kattungar", "cat", "cats", "kitten"] },
    { id: "dogs", label: "hundar", terms: ["hund", "hundar", "hundvalp", "dog", "dogs", "puppy", "puppies"] },
    { id: "nature", label: "natur", terms: ["natur", "skog", "skogar", "träd", "trad", "landskap", "mountain", "berg"] },
    { id: "coffee", label: "kaffe", terms: ["kaffe", "coffee", "espresso", "fika", "latte", "cappuccino"] },
    { id: "ocean", label: "hav", terms: ["hav", "ocean", "strand", "beach", "vatten", "sand"] },
    { id: "flowers", label: "blommor", terms: ["blomma", "blommor", "flower", "flowers", "rosor", "ros"] },
    { id: "mystic", label: "mystik", terms: ["tarot", "mystisk", "mystic", "kristall", "crystal", "ljus", "candle", "stjarnor", "stjärnor", "moon", "mane", "måne"] },
    { id: "food", label: "mat", terms: ["mat", "food", "middag", "lunch", "matratt", "maträtt", "restaurangmat"] },
    {
      id: "carpenter",
      label: "snickare och hantverk",
      terms: [
        "snickare",
        "sniockare",
        "hammare",
        "hantverk",
        "hantverkare",
        "snickeri",
        "bygg",
        "byggare",
        "verktyg",
        "carpenter",
        "hammer",
        "woodwork",
        "tradarbete",
        "träarbete",
      ],
    },
    {
      id: "electrician",
      label: "elektriker och elinstallation",
      terms: [
        "elektriker",
        "elektrik",
        "elinstallation",
        "eljour",
        "elmontor",
        "elmontör",
        "elservice",
        "elcentral",
        "belysning",
        "electrician",
        "electrical",
        "wiring",
        "switchboard",
      ],
    },
  ];

  function buildThemePack(heroIds, aboutId, cardIds, galleryIds) {
    const hero = heroIds.map(function (id) {
      return u(id, 1920, 1080);
    });
    const about = u(aboutId, 800, 1000);
    const cards = cardIds.map(function (id) {
      return u(id, 720, 480);
    });
    const gallery = galleryIds.map(function (id) {
      return u(id, 900, 700);
    });
    return { hero: hero, about: about, cards: cards, gallery: gallery };
  }

  const THEME_STOCK = {
    cats: buildThemePack(
      [
        "photo-1514888286974-6c03e2ca1dba",
        "photo-1574158622682-066a69d697de",
        "photo-1495360010541-f24372298a35",
        "photo-1518791841217-8f162f1e9901",
        "photo-1529778156132-4a4be08d5f4a",
      ],
      "photo-1574158622682-066a69d697de",
      [
        "photo-1514888286974-6c03e2ca1dba",
        "photo-1495360010541-f24372298a35",
        "photo-1518791841217-8f162f1e9901",
      ],
      [
        "photo-1574158622682-066a69d697de",
        "photo-1529778156132-4a4be08d5f4a",
        "photo-1514888286974-6c03e2ca1dba",
        "photo-1495360010541-f24372298a35",
      ]
    ),
    dogs: buildThemePack(
      [
        "photo-1587300003388-59208cc962cb",
        "photo-1552053831-71594a27632d",
        "photo-1548199973-03cce0bbc87b",
        "photo-1530281700549-e82e7bf010d6",
      ],
      "photo-1587300003388-59208cc962cb",
      [
        "photo-1552053831-71594a27632d",
        "photo-1548199973-03cce0bbc87b",
        "photo-1517849845537-4d257902454a",
      ],
      [
        "photo-1587300003388-59208cc962cb",
        "photo-1530281700549-e82e7bf010d6",
        "photo-1552053831-71594a27632d",
        "photo-1548199973-03cce0bbc87b",
      ]
    ),
    nature: buildThemePack(
      [
        "photo-1506905925346-21bda4d32df4",
        "photo-1441974231531-c6227db76b6e",
        "photo-1470071459604-3b72402f8d2a",
        "photo-1464822759023-fed622ff2c3b",
      ],
      "photo-1441974231531-c6227db76b6e",
      [
        "photo-1506905925346-21bda4d32df4",
        "photo-1470071459604-3b72402f8d2a",
        "photo-1464822759023-fed622ff2c3b",
      ],
      [
        "photo-1441974231531-c6227db76b6e",
        "photo-1506905925346-21bda4d32df4",
        "photo-1470071459604-3b72402f8d2a",
        "photo-1464822759023-fed622ff2c3b",
      ]
    ),
    coffee: buildThemePack(
      [
        "photo-1495474472287-4d71bcdd2085",
        "photo-1509041955497-befafd438932",
        "photo-1442512595331-e89e73853f31",
      ],
      "photo-1495474472287-4d71bcdd2085",
      [
        "photo-1509041955497-befafd438932",
        "photo-1442512595331-e89e73853f31",
        "photo-1495474472287-4d71bcdd2085",
      ],
      [
        "photo-1495474472287-4d71bcdd2085",
        "photo-1509041955497-befafd438932",
        "photo-1442512595331-e89e73853f31",
        "photo-1509041955497-befafd438932",
      ]
    ),
    ocean: buildThemePack(
      [
        "photo-1505142468610-359e7d316be0",
        "photo-1507525428034-b723cf961d3e",
        "photo-1518837699415-13c194944579",
      ],
      "photo-1507525428034-b723cf961d3e",
      [
        "photo-1505142468610-359e7d316be0",
        "photo-1518837699415-13c194944579",
        "photo-1507525428034-b723cf961d3e",
      ],
      [
        "photo-1505142468610-359e7d316be0",
        "photo-1507525428034-b723cf961d3e",
        "photo-1518837699415-13c194944579",
        "photo-1505142468610-359e7d316be0",
      ]
    ),
    flowers: buildThemePack(
      [
        "photo-1490759842868-88d6d286da66",
        "photo-1462275646964-a1e12f2f4711",
        "photo-1508610048650-a06b669ffe84",
      ],
      "photo-1490759842868-88d6d286da66",
      [
        "photo-1462275646964-a1e12f2f4711",
        "photo-1508610048650-a06b669ffe84",
        "photo-1490759842868-88d6d286da66",
      ],
      [
        "photo-1490759842868-88d6d286da66",
        "photo-1462275646964-a1e12f2f4711",
        "photo-1508610048650-a06b669ffe84",
        "photo-1462275646964-a1e12f2f4711",
      ]
    ),
    mystic: buildThemePack(
      [
        "photo-1507003211169-0e0290296852",
        "photo-1518192516457-3e870368d0d8",
        "photo-1545389336-cf090694435e",
        "photo-1532619675605-1d608e0a1f9a",
      ],
      "photo-1518192516457-3e870368d0d8",
      [
        "photo-1532619675605-1d608e0a1f9a",
        "photo-1518709268805-4e9042af2176",
        "photo-1545389336-cf090694435e",
      ],
      [
        "photo-1532619675605-1d608e0a1f9a",
        "photo-1518192516457-3e870368d0d8",
        "photo-1545389336-cf090694435e",
        "photo-1507003211169-0e0290296852",
      ]
    ),
    food: buildThemePack(
      [
        "photo-1414235077428-338989a2e8c0",
        "photo-1504674900247-0877df9cc836",
        "photo-1546069901-ba9599a7e63c",
      ],
      "photo-1504674900247-0877df9cc836",
      [
        "photo-1414235077428-338989a2e8c0",
        "photo-1546069901-ba9599a7e63c",
        "photo-1504674900247-0877df9cc836",
      ],
      [
        "photo-1414235077428-338989a2e8c0",
        "photo-1504674900247-0877df9cc836",
        "photo-1546069901-ba9599a7e63c",
        "photo-1414235077428-338989a2e8c0",
      ]
    ),
    carpenter: buildThemePack(
      SNICKARE_HERO_IDS,
      "photo-1541753866382-081a052f842a",
      SNICKARE_HERO_IDS.slice(0, 3),
      SNICKARE_HERO_IDS
    ),
    electrician: buildThemePack(
      ELEKTRIKER_HERO_IDS,
      "photo-1581092160562-40aa08e78837",
      ELEKTRIKER_HERO_IDS.slice(0, 3),
      ELEKTRIKER_HERO_IDS
    ),
  };

  function parseThemeFromText(raw) {
    const IC = global.ImageCatalog;
    if (IC && typeof IC.parseThemeFromText === "function") {
      return IC.parseThemeFromText(raw);
    }
    const normalized = normalizeThemeText(raw);
    if (!normalized) return null;
    let best = null;
    let bestScore = 0;
    IMAGE_THEME_HINTS.forEach(function (row) {
      let score = 0;
      row.terms.forEach(function (term) {
        const needle = normalizeThemeText(term);
        if (!needle) return;
        if (needle.length >= 4 || needle.indexOf(" ") >= 0) {
          if (normalized.indexOf(needle) >= 0) score += 3;
        } else if (new RegExp("(?:^|[^a-z0-9])" + needle + "(?:$|[^a-z0-9])").test(normalized)) {
          score += 2;
        }
      });
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    });
    return bestScore >= 2 ? best : null;
  }

  /**
   * @param {"hero"|"about"|"card"|"gallery"} kind
   * @param {string} themeId
   * @param {{ nonce?: number|string; cardIndex?: number; galleryIndex?: number }} [opts]
   */
  function pickThemeUrl(kind, themeId, opts) {
    opts = opts || {};
    const ISE = global.ImageSelectionEngine;
    const IC = global.ImageCatalog;
    if (ISE && IC && typeof ISE.pick === "function") {
      const SS = global.SiteState;
      const doc = SS && SS.get ? SS.get() : { page: {}, sections: {} };
      const profile = IC.THEME_PROFILES && IC.THEME_PROFILES[themeId];
      return ISE.pick(doc, {
        section: kind,
        theme: profile ? { id: themeId, label: profile.label, profile: profile } : { id: themeId },
        cardIndex: opts.cardIndex,
        galleryIndex: opts.galleryIndex,
        nonce: opts.nonce,
      });
    }
    const pack = THEME_STOCK[themeId];
    if (!pack) return "";
    const salt = opts.nonce != null ? opts.nonce : Date.now() + Math.random();
    if (kind === "hero") {
      if (themeId === "carpenter") return pickCarpenterHeroUrl(opts);
      if (themeId === "electrician") return pickElectricianHeroUrl(opts);
      const arr = pack.hero || [];
      if (!arr.length) return "";
      const i = simpleHash(themeId + "|h|" + String(salt)) % arr.length;
      return arr[i];
    }
    if (kind === "about") return pack.about || "";
    if (kind === "card") {
      const arr = pack.cards || [];
      if (!arr.length) return "";
      const ci = Number(opts.cardIndex) || 0;
      const i = simpleHash(themeId + "|c|" + ci + "|" + String(salt)) % arr.length;
      return arr[i];
    }
    if (kind === "gallery") {
      const arr = pack.gallery || [];
      if (!arr.length) return "";
      const gi = Number(opts.galleryIndex) >= 0 ? opts.galleryIndex : 0;
      const i = simpleHash(themeId + "|g|" + gi + "|" + String(salt)) % arr.length;
      return arr[i];
    }
    return "";
  }

  function themeLabels() {
    const IC = global.ImageCatalog;
    if (IC && typeof IC.themeLabels === "function") return IC.themeLabels();
    return IMAGE_THEME_HINTS.map(function (row) {
      return row.label;
    });
  }

  /** Register legacy STOCK packs into ImageCatalog registry for ISE scoring. */
  function ingestStockIntoCatalog() {
    const IC = global.ImageCatalog;
    if (!IC || !IC.registerPackUrls) return;
    Object.keys(STOCK).forEach(function (industry) {
      const moods = STOCK[industry];
      if (!moods) return;
      Object.keys(moods).forEach(function (mood) {
        const pack = moods[mood];
        if (!pack) return;
        if (pack.hero) IC.registerPackUrls(industry, mood, "hero", pack.hero);
        if (pack.about) IC.registerPackUrls(industry, mood, "about", pack.about);
        if (pack.cards) IC.registerPackUrls(industry, mood, "card", pack.cards);
        if (pack.gallery) IC.registerPackUrls(industry, mood, "gallery", pack.gallery);
      });
    });
    Object.keys(THEME_STOCK).forEach(function (themeId) {
      const pack = THEME_STOCK[themeId];
      if (!pack) return;
      const pseudoIndustry = themeId === "carpenter" ? "byggfirma" : themeId === "electrician" ? "elektriker" : themeId;
      if (pack.hero) IC.registerPackUrls(pseudoIndustry, "soft", "hero", pack.hero);
      if (pack.about) IC.registerPackUrls(pseudoIndustry, "soft", "about", pack.about);
      if (pack.cards) IC.registerPackUrls(pseudoIndustry, "soft", "card", pack.cards);
      if (pack.gallery) IC.registerPackUrls(pseudoIndustry, "soft", "gallery", pack.gallery);
    });
  }

  ingestStockIntoCatalog();

  global.VisualStock = {
    pickUrl,
    pickThemeUrl,
    pickCarpenterHeroUrl,
    parseThemeFromText,
    themeLabels,
    defaultsFor,
    applyToDocument,
    moodForTemplate,
    resolvePack,
    picsumFallback,
  };
})(typeof window !== "undefined" ? window : globalThis);
