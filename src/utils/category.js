export function filterProductsByCategory(products, category, subcategory = "") {
  return products.filter((product) => {
    if (product.category !== category) {
      return false;
    }

    if (subcategory && product.subcategory !== subcategory) {
      return false;
    }

    return true;
  });
}
