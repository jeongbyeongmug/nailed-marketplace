import { useState } from "react";
import ProductCard from "./ProductCard";

const INITIAL_VISIBLE_COUNT = 5;
const INCREMENT_COUNT = 10;

function ProductSection({ title, products }) {
  const safeProducts = Array.isArray(products) ? products : [];
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const visibleProducts = safeProducts.slice(0, visibleCount);
  const hasMore = visibleCount < safeProducts.length;

  const handleLoadMore = () => {
    setVisibleCount((currentCount) =>
      Math.min(currentCount + INCREMENT_COUNT, safeProducts.length),
    );
  };

  return (
    <section className="product-section">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {visibleProducts.length > 0 ? (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id || product.name} link="/" product={product} />
          ))}
        </div>
      ) : (
        <p className="empty-result">표시할 상품이 없습니다.</p>
      )}
      {hasMore && (
        <button className="more-button section-more-button" type="button" onClick={handleLoadMore}>
          더보기
          <span aria-hidden="true">⌄</span>
        </button>
      )}
    </section>
  );
}

export default ProductSection;
