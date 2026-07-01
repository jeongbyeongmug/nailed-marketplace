export function normalizeSearchKeyword(keyword) {
  return keyword.trim();
}

export function isValidSearchKeyword(keyword) {
  const normalizedKeyword = normalizeSearchKeyword(keyword);

  return normalizedKeyword.length >= 2 && /[\p{L}\p{N}]/u.test(normalizedKeyword);
}

export function searchProducts(products, keyword) {
  const normalizedKeyword = normalizeSearchKeyword(keyword).toLowerCase();

  if (!isValidSearchKeyword(normalizedKeyword)) {
    return [];
  }

  return products.filter((product) => {
    const searchableText = [
      product.name,
      product.brand,
      product.description,
      product.category,
      product.subcategory,
      product.seller,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedKeyword);
  });
}
