import { toBrandNameEn } from "../../utils/brandName";
import { API_BASE_URL } from "../../api/config";

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function ProductCard({ product }) {
  const productId = product.id || product.productId;
  const title = product.name || product.title || "";
  const price = product.price;
  const rawUrl = product.imageUrl || product.thumbnailUrl || null;
  const imageUrl = rawUrl && !rawUrl.startsWith("http") ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  const brandName = product.brandName || null;
  const size = product.size || null;
  const wishlistCount = product.wishlistCount ?? 0;
  const isSold = product.productStatus === "SOLD";

  return (
    <article className="product-card" onClick={() => navigate(`/product/${productId}`)}>
      <div className="product-visual">
        {imageUrl
          ? <img className="product-image" src={imageUrl} alt={title} />
          : <div className="product-no-img" />}
        {isSold && (
          <div className="product-card-sold-overlay">
            <span>SOLD</span>
          </div>
        )}
        <div className="product-heart-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="product-heart-count">{wishlistCount}</span>
        </div>
      </div>
      <div className="product-info">
        {brandName && (
          <div className="product-brand-row">
            <span className="product-brand-name">{toBrandNameEn(brandName)}</span>
            {size && <span className="product-size-tag">{size}</span>}
          </div>
        )}
        {!brandName && size && (
          <div className="product-brand-row">
            <span className="product-size-tag">{size}</span>
          </div>
        )}
        <p className="product-card-title">{title}</p>
        <p className="product-card-price">
          {typeof price === "number" ? price.toLocaleString() : price}원
        </p>
      </div>
    </article>
  );
}

export default ProductCard;
