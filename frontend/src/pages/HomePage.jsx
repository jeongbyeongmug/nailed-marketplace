import { useEffect, useState } from "react";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import HeroBanner from "../components/home/HeroBanner";
import ProductCard from "../components/home/ProductCard";
import { getProductListByCode, getRandomProducts, getPopularProducts } from "../api/productApi";
import { banners } from "../data/bannerData";

const SECTION_PRODUCT_COUNT = 5;
const LUXURY_PRODUCT_FETCH_SIZE = 30;
const RANDOM_PRODUCT_FETCH_SIZE = 150;
const LOVED_INITIAL_COUNT = 25;
const LOVED_INCREMENT_COUNT = 15;
const HOUR_MS = 60 * 60 * 1000;
const EDITOR_RECOMMENDATIONS = [
  { id: "menswear", title: "맨즈웨어" },
  { id: "womenswear", title: "우먼즈웨어" },
  { id: "luxury", title: "럭셔리" },
  { id: "kawaii", title: "액세서리" },
  { id: "itTech", title: "IT/테크" },
  { id: "backpack", title: "Bag your Back" },
];
const LUXURY_BRANDS = [
  { label: "Goyard", value: "goyard" },
  { label: "Bottega Veneta", value: "bottega-veneta" },
  { label: "Dior", value: "dior" },
  { label: "Louis Vuitton", value: "louis-vuitton" },
  { label: "Gucci", value: "gucci" },
  { label: "Prada", value: "prada" },
  { label: "Hermes", value: "hermes" },
  { label: "Chanel", value: "chanel" },
];

function toCardShape(p) {
  return {
    id: p.productId,
    productId: p.productId,
    name: p.title,
    title: p.title,
    price: p.price,
    imageUrl: p.thumbnailUrl || null,
    thumbnailUrl: p.thumbnailUrl || null,
    brandName: p.brandName || null,
    size: p.size || null,
    wishlistCount: p.wishlistCount ?? 0,
    productStatus: p.productStatus || null,
    viewCount: p.viewCount ?? null,
    categoryCode: p.categoryCode || null,
    categoryName: p.categoryName || null,
    categoryPath: p.categoryPath || null,
  };
}

function getProductId(product) {
  return product?.productId ?? product?.id;
}

function isVisibleProduct(product) {
  const status = product?.productStatus;
  return status !== "SOLD" && status !== "DELETED";
}

function normalizeProductList(data) {
  const list = Array.isArray(data) ? data : (data?.content ?? []);
  return list
    .map(toCardShape)
    .filter((product) => getProductId(product) !== undefined && getProductId(product) !== null)
    .filter(isVisibleProduct);
}

function pickPopularProducts(products) {
  // 인기 정렬은 백엔드(인기점수 = 조회수 + 찜수×3)에서 처리하므로
  // 프론트는 백엔드가 내려준 순서를 그대로 사용한다. (이중 정렬 제거)
  return products.slice(0, SECTION_PRODUCT_COUNT);
}

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function pickHourlyProducts(products, hourKey, excludedIds, count = SECTION_PRODUCT_COUNT) {
  return [...products]
    .filter((product) => !excludedIds.has(String(getProductId(product))))
    .sort((a, b) => {
      const aHash = hashString(`${hourKey}:${getProductId(a)}`);
      const bHash = hashString(`${hourKey}:${getProductId(b)}`);
      return aHash - bHash;
    })
    .slice(0, count);
}

function addProductIds(targetSet, products) {
  products.forEach((product) => {
    const productId = getProductId(product);
    if (productId !== undefined && productId !== null) {
      targetSet.add(String(productId));
    }
  });
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function HomeProductSection({ title, products }) {
  return (
    <section className="product-section">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={getProductId(product)} product={product} />
          ))}
        </div>
      ) : (
        <p className="empty-result">표시할 상품이 없습니다.</p>
      )}
    </section>
  );
}

function LuxuryBrandSection() {
  return (
    <section className="product-section luxury-brand-band">
      <div className="luxury-brand-inner">
        <div className="section-heading">
          <h2>럭셔리 브랜드</h2>
        </div>
        <div className="luxury-brand-list">
          {LUXURY_BRANDS.map((brand) => (
            <button
              type="button"
              className="luxury-brand-item"
              key={brand.value}
              onClick={() => navigate(`/category/luxury?subcategory=${brand.value}`)}
            >
              {brand.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function EditorRecommendationSection() {
  const bannerMap = new Map(banners.map((banner) => [banner.id, banner]));
  const editorItems = EDITOR_RECOMMENDATIONS.map((item) => ({
    ...item,
    banner: bannerMap.get(item.id),
  })).filter((item) => item.banner);

  return (
    <section className="product-section editor-section">
      <div className="section-heading">
        <h2>에디터 추천</h2>
      </div>
      <div className="editor-grid">
        {editorItems.map((item) => (
          <button
            type="button"
            className="editor-card"
            key={item.id}
            onClick={() => navigate(item.banner.link)}
          >
            <img src={item.banner.editorImageUrl || item.banner.imageUrl} alt="" />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function LovedProductSection({ products, visibleCount, onLoadMore }) {
  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount === LOVED_INITIAL_COUNT && products.length > LOVED_INITIAL_COUNT;

  return (
    <section className="product-section loved-section">
      <div className="section-heading">
        <h2>지금 사랑받는 아이템</h2>
      </div>
      {visibleProducts.length > 0 ? (
        <div className="product-grid loved-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={getProductId(product)} product={product} />
          ))}
        </div>
      ) : (
        <p className="empty-result">표시할 상품이 없습니다.</p>
      )}
      {hasMore && (
        <button className="more-button loved-more-button" type="button" onClick={onLoadMore}>
          더보기
          <span aria-hidden="true">⌄</span>
        </button>
      )}
    </section>
  );
}

function HomePage() {
  const [popularProducts, setPopularProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [hiddenLuxuryProducts, setHiddenLuxuryProducts] = useState([]);
  const [lovedProducts, setLovedProducts] = useState([]);
  const [lovedVisibleCount, setLovedVisibleCount] = useState(LOVED_INITIAL_COUNT);

  useEffect(() => {
    let ignore = false;

    async function loadHomeProducts() {
      const hourKey = Math.floor(Date.now() / HOUR_MS);
      const selectedIds = new Set();

      const [popularData, randomData, luxuryData] = await Promise.allSettled([
        getPopularProducts(),
        getRandomProducts(RANDOM_PRODUCT_FETCH_SIZE),
        getProductListByCode("LUXURY", 0, LUXURY_PRODUCT_FETCH_SIZE),
      ]);

      if (ignore) return;

      const popularList = popularData.status === "fulfilled" ? normalizeProductList(popularData.value) : [];
      const randomList = randomData.status === "fulfilled" ? normalizeProductList(randomData.value) : [];
      const luxuryList = luxuryData.status === "fulfilled" ? normalizeProductList(luxuryData.value) : [];

      const nextPopularProducts = pickPopularProducts(popularList);
      addProductIds(selectedIds, nextPopularProducts);

      const nextRecommendedProducts = pickHourlyProducts(randomList, hourKey, selectedIds);
      addProductIds(selectedIds, nextRecommendedProducts);

      const nextHiddenLuxuryProducts = pickHourlyProducts(luxuryList, hourKey, selectedIds);
      addProductIds(selectedIds, nextHiddenLuxuryProducts);

      const nextLovedProducts = pickHourlyProducts(randomList, hourKey, selectedIds, RANDOM_PRODUCT_FETCH_SIZE);

      setPopularProducts(nextPopularProducts);
      setRecommendedProducts(nextRecommendedProducts);
      setHiddenLuxuryProducts(nextHiddenLuxuryProducts);
      setLovedProducts(nextLovedProducts);
      setLovedVisibleCount(LOVED_INITIAL_COUNT);
    }

    loadHomeProducts();
    const timerId = window.setInterval(loadHomeProducts, HOUR_MS);

    return () => {
      ignore = true;
      window.clearInterval(timerId);
    };
  }, []);

  const handleLovedLoadMore = () => {
    setLovedVisibleCount(Math.min(LOVED_INITIAL_COUNT + LOVED_INCREMENT_COUNT, lovedProducts.length));
  };

  return (
    <div className="home-page">
      <Header />
      <main>
        <HeroBanner />
        <div className="home-content">
          <HomeProductSection title="인기상품" products={popularProducts} />
          <LuxuryBrandSection />
          <HomeProductSection title="추천 상품" products={recommendedProducts} />
          <HomeProductSection title="숨겨진 명품" products={hiddenLuxuryProducts} />
          <EditorRecommendationSection />
          <LovedProductSection
            products={lovedProducts}
            visibleCount={lovedVisibleCount}
            onLoadMore={handleLovedLoadMore}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
