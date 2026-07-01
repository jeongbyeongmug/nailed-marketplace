// DB code → URL slug 변환 맵 (URL 라우팅 전용 — 백엔드는 slug를 저장하지 않으므로 프론트에서 관리)
export const CODE_TO_SLUG = {
  // 최상위 카테고리
  MENS:   "menswear",
  WOMENS: "womenswear",
  LUXURY: "luxury",
  ACC:    "accessory",
  IT:     "tech",

  // 맨즈 그룹
  MENS_TOP:    "top",
  MENS_OUTER:  "outer",
  MENS_BOTTOM: "bottom",
  MENS_SHOES:  "shoes",
  MENS_BAG:    "bag",
  MENS_CAP:    "hat",

  // 우먼즈 그룹
  WOMENS_TOP:    "top",
  WOMENS_OUTER:  "outer",
  WOMENS_BOTTOM: "bottom",
  WOMENS_SHOES:  "shoes",
  WOMENS_BAG:    "bag",
  WOMENS_CAP:    "hat",
  WOMENS_SKIRT:  "skirt",
  WOMENS_DRESS:  "onepiece",

  // 럭셔리 그룹
  LUXURY_BRAND: "brand",

  // 액세서리 그룹
  ACC_FASHION: "fashion-goods",
  ACC_JEWELRY: "jewelry",

  // IT 그룹
  IT_DEVICE: "device",

  // 맨즈 아이템
  MENS_TOP_TSHIRT:      "t-shirt",
  MENS_TOP_HOODIE:      "hoodie",
  MENS_TOP_KNIT:        "knit",
  MENS_TOP_SWEATSHIRT:  "sweatshirt",
  MENS_TOP_SHIRT:       "shirt",
  MENS_TOP_CARDIGAN:    "cardigan",
  MENS_OUTER_JERSEY:    "jersey",
  MENS_OUTER_WINDBREAKER: "windbreaker",
  MENS_OUTER_JACKET:    "jacket",
  MENS_OUTER_HOODIE_ZIP: "hood-zipup",
  MENS_OUTER_BLOUSON:   "bomber",
  MENS_OUTER_COAT:      "coat",
  MENS_OUTER_PADDING:   "padding",
  MENS_BOTTOM_SHORTS:   "shorts",
  MENS_BOTTOM_DENIM:    "denim-pants",
  MENS_BOTTOM_CARGO:    "cargo-pants",
  MENS_BOTTOM_SWEAT:    "sweat-pants",
  MENS_BOTTOM_SLACKS:   "slacks",
  MENS_SHOES_SNEAKERS:  "sneakers",
  MENS_SHOES_BOOTS:     "boots",
  MENS_SHOES_LOAFER:    "loafer",
  MENS_SHOES_SANDAL:    "sandals",
  MENS_BAG_BACKPACK:    "backpack",
  MENS_BAG_CROSSBODY:   "cross-bag",
  MENS_BAG_SHOULDER:    "shoulder-bag",
  MENS_BAG_TOTE:        "tote-bag",
  MENS_CAP_CAP:         "cap",
  MENS_CAP_BEANIE:      "beanie",

  // 우먼즈 아이템
  WOMENS_TOP_TSHIRT:      "t-shirt",
  WOMENS_TOP_HOODIE:      "hoodie",
  WOMENS_TOP_KNIT:        "knit",
  WOMENS_TOP_SWEATSHIRT:  "sweatshirt",
  WOMENS_TOP_SHIRT:       "shirt",
  WOMENS_TOP_CARDIGAN:    "cardigan",
  WOMENS_OUTER_JERSEY:    "jersey",
  WOMENS_OUTER_WINDBREAKER: "windbreaker",
  WOMENS_OUTER_JACKET:    "jacket",
  WOMENS_OUTER_HOODIE_ZIP: "hood-zipup",
  WOMENS_OUTER_COAT:      "coat",
  WOMENS_OUTER_PADDING:   "padding",
  WOMENS_BOTTOM_SHORTS:   "shorts",
  WOMENS_BOTTOM_DENIM:    "denim-pants",
  WOMENS_BOTTOM_CARGO:    "cargo-pants",
  WOMENS_BOTTOM_SWEAT:    "sweat-pants",
  WOMENS_BOTTOM_SLACKS:   "slacks",
  WOMENS_SHOES_SNEAKERS:  "sneakers",
  WOMENS_SHOES_BOOTS:     "boots",
  WOMENS_SHOES_LOAFER:    "loafer",
  WOMENS_SHOES_SANDAL:    "sandals",
  WOMENS_BAG_BACKPACK:    "backpack",
  WOMENS_BAG_CROSSBODY:   "cross-bag",
  WOMENS_BAG_SHOULDER:    "shoulder-bag",
  WOMENS_BAG_TOTE:        "tote-bag",
  WOMENS_CAP_CAP:         "cap",
  WOMENS_CAP_BEANIE:      "beanie",
  WOMENS_SKIRT_LONG:      "long-skirt",
  WOMENS_SKIRT_MINI:      "mini-skirt",
  WOMENS_DRESS_LONG:      "long-onepiece",
  WOMENS_DRESS_MINI:      "mini-onepiece",

  // 럭셔리 아이템
  LUXURY_GOYARD:        "goyard",
  LUXURY_BOTTEGA:       "bottega-veneta",
  LUXURY_DIOR:          "dior",
  LUXURY_LV:            "louis-vuitton",
  LUXURY_GUCCI:         "gucci",
  LUXURY_PRADA:         "prada",
  LUXURY_FERRAGAMO:     "ferragamo",
  LUXURY_MONTBLANC:     "montblanc",
  LUXURY_HERMES:        "hermes",
  LUXURY_BURBERRY:      "burberry",
  LUXURY_CHANEL:        "chanel",
  LUXURY_CHROME_HEARTS: "chrome-hearts",

  // 액세서리 아이템
  ACC_SUNGLASS:          "sunglasses",
  ACC_WALLET:            "wallet",
  ACC_BELT:              "belt",
  ACC_KEYRING:           "keyring",
  ACC_JEWELRY_NECKLACE:  "necklace",
  ACC_JEWELRY_RING:      "ring",
  ACC_JEWELRY_WATCH:     "watch",
  ACC_JEWELRY_BRACELET:  "bracelet",

  // IT 아이템
  IT_CAMERA: "camera",
  IT_PHONE:  "mobile",
  IT_LAPTOP: "laptop",
  IT_TABLET: "tablet",
};

// API 응답(flat list)을 헬퍼 함수가 사용하는 트리 구조로 변환
// 입력: [{ groupId, code, name, parentCode, sizeType }, ...]
// 출력: [{ label, value, categoryDbCode, groups: [{ title, value, groupDbCode, items: [...] }] }]
export function buildCategoryTree(flatList) {
  const topCategories = flatList.filter((g) => g.parentCode === null);
  return topCategories.map((cat) => ({
    label: cat.name,
    value: CODE_TO_SLUG[cat.code] || cat.code.toLowerCase(),
    categoryDbCode: cat.code,
    groups: flatList
      .filter((g) => g.parentCode === cat.code)
      .map((grp) => ({
        title: grp.name,
        value: CODE_TO_SLUG[grp.code] || grp.code.toLowerCase(),
        groupDbCode: grp.code,
        items: flatList
          .filter((g) => g.parentCode === grp.code)
          .map((item) => ({
            label: item.name,
            value: CODE_TO_SLUG[item.code] || item.code.toLowerCase(),
            dbCode: item.code,
          })),
      })),
  }));
}

export function getCategoryItems(category) {
  return category?.groups.flatMap((group) => group.items) || [];
}

// categories 배열을 첫 번째 인자로 받음 (useCategories 훅에서 제공)
export function findCategory(categories, categoryValue) {
  return categories.find((category) => category.value === categoryValue);
}

export function findSubcategory(category, subcategoryValue) {
  const group = category?.groups.find((g) => g.value === subcategoryValue);
  if (group) {
    return { label: group.title, value: group.value };
  }
  return getCategoryItems(category).find((s) => s.value === subcategoryValue);
}

// categories 배열을 첫 번째 인자로 받음 (useCategories 훅에서 제공)
export function categoryCodeToUrl(categories, dbCode) {
  if (!dbCode) return "/";
  for (const cat of categories) {
    if (cat.categoryDbCode === dbCode) {
      return `/category/${cat.value}`;
    }
    for (const grp of cat.groups) {
      if (grp.groupDbCode === dbCode) {
        return `/category/${cat.value}?subcategory=${grp.value}`;
      }
      for (const item of grp.items) {
        if (item.dbCode === dbCode) {
          return `/category/${cat.value}?subcategory=${item.value}`;
        }
      }
    }
  }
  return "/";
}

export function resolveDbCode(category, subcategoryValue) {
  if (!category) return null;
  if (!subcategoryValue) return category.categoryDbCode;

  const group = category.groups.find((g) => g.value === subcategoryValue);
  if (group) return group.groupDbCode;

  for (const grp of category.groups) {
    const item = grp.items.find((i) => i.value === subcategoryValue);
    if (item) return item.dbCode;
  }

  return category.categoryDbCode;
}
