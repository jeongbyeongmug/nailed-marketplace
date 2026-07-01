import { useEffect, useRef, useState } from "react";
import deliveryTruck from '../assets/deliverytruck.png';
import deliveryBox from '../assets/deliverybox.png';
import shieldIcon from '../assets/shield.png';
import Footer from "../components/common/Footer";
import Header from "../components/common/Header";
import ReportModal from "../components/ReportModal";
import { toBrandNameEn } from "../utils/brandName";
import { addWishlist, getProductDetail, getRandomProducts, getRelatedProducts, getSellerProducts, incrementViewCount, removeWishlist } from "../api/productApi";
import { categoryCodeToUrl } from "../data/categories";
import { useCategories } from "../hooks/useCategories";
import "../styles/product-detail.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const DEFAULT_PROFILE = `${API_BASE_URL}/images/profileImg/default-profile.png`;
const GRADE = { BRONZE: "브론즈", SILVER: "실버", GOLD: "골드", DIAMOND: "다이아" };
const STATUS = { ON_SALE: "판매중", SOLD: "판매완료" };

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

/* ── 갤러리 ── */
function getProductImageUrls(product) {
  if (Array.isArray(product?.imageUrls)) {
    return product.imageUrls.filter(Boolean);
  }

  return product?.imageUrl ? [product.imageUrl] : [];
}

function getProductImageUrl(product) {
  return getProductImageUrls(product)[0] ?? "";
}

function Gallery({ imageUrls, title, brandName, isSold }) {
  const [cur, setCur] = useState(0);
  const hasImages = imageUrls && imageUrls.length > 0;
  if (!hasImages) return null;

  const count = hasImages ? imageUrls.length : 1;
  const prev = () => setCur((c) => (c - 1 + count) % count);
  const next = () => setCur((c) => (c + 1) % count);

  return (
    <div className="pd-gallery">
      <div className="pd-gallery-main">
        <img src={imageUrls[cur]} alt={`${title} ${cur + 1}`} />
        {isSold && (
          <div className="pd-gallery-sold-overlay">
            <span>SOLD</span>
          </div>
        )}
        {hasImages && count > 1 && (
          <>
            <button className="pd-gallery-arrow pd-gallery-arrow-l" onClick={prev} aria-label="이전">‹</button>
            <button className="pd-gallery-arrow pd-gallery-arrow-r" onClick={next} aria-label="다음">›</button>
            <div className="pd-gallery-dots">
              {Array.from({ length: count }).map((_, i) => (
                <button key={i} className={`pd-dot ${i === cur ? "active" : ""}`} onClick={() => setCur(i)} aria-label={`${i + 1}번 이미지`} />
              ))}
            </div>
          </>
        )}
        {hasImages && count > 1 && (
          <span className="pd-gallery-counter">{cur + 1} / {count}</span>
        )}
      </div>
    </div>
  );
}

/* ── 상품 설명 (접기/펼치기) ── */
function DescriptionBox({ text }) {
  return (
    <div className="pd-desc-wrap">
      <div className="pd-desc">
        {text}
      </div>
    </div>
  );
}

/* ── Nailed 인증 안심 거래 (접기/펼치기) ── */
function AccordionItem({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`pd-acc-item ${open ? "open" : ""}`}>
      <button className="pd-acc-head" onClick={() => setOpen((o) => !o)}>
        <span className="pd-acc-title">{title}</span>
        <span className="pd-acc-icon" aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="pd-acc-body">{children}</div>}
    </div>
  );
}

function SafeSection() {
  return (
    <section className="pd-accordion">
      <AccordionItem title="배송정보">
        <ul className="pd-safe-bullets">
          <li>상품은 판매자 측에서 직접 배송하며 평균적으로 2일 이내 배송이 시작됩니다.</li>
          <li>배송 상태는 마이페이지에서 확인 가능하고, 그 외 문의는 판매자에게 연락해 주시기 바랍니다.</li>
          <li>도움이 필요하신 경우에 Nailed 고객센터로 문의해 주시면 확인 도와드리겠습니다.</li>
        </ul>
      </AccordionItem>
      <AccordionItem title="결제 취소 정책">
        <p className="pd-safe-para">상품이 발송되기 전까지는 결제를 취소하실 수 있습니다. 결제 취소는 마이페이지의 주문 상세내역에서 직접 진행하실 수 있습니다.</p>
        <p className="pd-safe-para">판매자가 주문을 접수한 이후 단계 (주문접수 · 배송중 · 배송완료) 에서는 결제 취소가 불가능합니다.</p>
        <ul className="pd-safe-bullets">
          <li>결제를 취소하면 해당 주문은 자동으로 종료됩니다.</li>
          <li>취소된 상품은 다시 판매 상태로 전환되며 다른 구매자가 구매할 수 있습니다.</li>
        </ul>
        <p className="pd-safe-para pd-safe-warn">외부(계좌) 거래 시, Nailed 고객 지원이 불가능합니다.</p>
      </AccordionItem>
    </section>
  );
}

/* ── localStorage 최근 본 상품 ── */
const RECENTLY_VIEWED_KEY = "nailed_recently_viewed";

function saveRecentlyViewed(id) {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
    const updated = [String(id), ...ids.filter((x) => String(x) !== String(id))].slice(0, 6);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {}
}

function removeRecentlyViewed(id) {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(
      ids.filter((x) => String(x) !== String(id))
    ));
  } catch {}
}

function getRecentlyViewedIds(excludeId) {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]")
      .filter((id) => String(id) !== String(excludeId));
  } catch {
    return [];
  }
}

/* ── 조회수 중복 집계 방지 (브라우저 단위, F5/재진입 시 재호출 차단) ── */
const VIEWED_KEY = "nailed_viewed_products";
const VIEW_DEDUP_MS = 60 * 60 * 1000; // 같은 상품은 1시간 내 1회만 집계

function shouldCountView(id) {
  try {
    const viewed = JSON.parse(localStorage.getItem(VIEWED_KEY) || "{}");
    const key = String(id);
    const now = Date.now();
    if (viewed[key] && now - viewed[key] < VIEW_DEDUP_MS) return false;
    viewed[key] = now;
    localStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
    return true;
  } catch {
    return true; // localStorage 사용 불가 시 기존 동작 유지
  }
}

/* ── 상품 미니카드 & 섹션 ── */
function ProductMiniCard({ product }) {
  const imgUrl = product.thumbnailUrl || getProductImageUrl(product);
  const brand = product.brandName ? toBrandNameEn(product.brandName) : null;
  const wishlistCount = product.wishlistCount ?? 0;
  const isSold = product.productStatus === "SOLD";
  return (
    <article className="product-card" onClick={() => navigate(`/product/${product.productId}`)}>
      <div className="product-visual">
        {imgUrl
          ? <img className="product-image" src={imgUrl} alt={product.title} />
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
        {brand && (
          <div className="product-brand-row">
            <span className="product-brand-name">{brand}</span>
            {product.size && <span className="product-size-tag">{product.size}</span>}
          </div>
        )}
        {!brand && product.size && (
          <div className="product-brand-row">
            <span className="product-size-tag">{product.size}</span>
          </div>
        )}
        <p className="product-card-title">{product.title}</p>
        <p className="product-card-price">{product.price?.toLocaleString()}원</p>
      </div>
    </article>
  );
}

function ProductRowSection({ title, products }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="pd-row-section">
      <h2 className="pd-section-title">{title}</h2>
      <div className="pd-five-grid">
        {products.map((p) => <ProductMiniCard key={p.productId} product={p} />)}
      </div>
    </section>
  );
}

function ProductDetailPage({ productId }) {
  const categories = useCategories();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState("");
  const timerRef = useRef(null);

  const [sellerProducts, setSellerProducts] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [randomProducts, setRandomProducts] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [capturedRecentIds, setCapturedRecentIds] = useState([]);

  const session = (() => { try { return JSON.parse(sessionStorage.getItem("nailed_session") ?? "null"); } catch { return null; } })();
  const currentMemberId = session?.member_id ?? session?.memberId ?? null;

  function showToast(msg) {
    setToast(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(""), 2400);
  }

  useEffect(() => {
    setCapturedRecentIds(getRecentlyViewedIds(productId));
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    setWishlisted(false);
    setSellerProducts([]);
    setRecentProducts([]);
    setRandomProducts([]);
    setRelatedProducts([]);
    getProductDetail(productId)
      .then((data) => {
        setProduct(data);
        setWishlisted(!!data.isWishlisted);
        saveRecentlyViewed(productId);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    if (shouldCountView(productId)) {
      incrementViewCount(productId);
    }
    return () => clearTimeout(timerRef.current);
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    getSellerProducts(product.seller.memberId, productId)
      .then((list) => setSellerProducts(list || []))
      .catch(() => {});
  }, [product?.seller?.memberId, productId]);

  useEffect(() => {
    if (!product || capturedRecentIds.length === 0) return;
    Promise.all(
      capturedRecentIds.map((id) =>
        getProductDetail(id).catch(() => {
          removeRecentlyViewed(id);
          return null;
        })
      )
    )
      .then((results) => setRecentProducts(results.filter(Boolean).slice(0, 5)))
      .catch(() => {});
  }, [product, capturedRecentIds]);

  useEffect(() => {
    getRandomProducts(15)
      .then((list) => {
        const filtered = (list || []).filter((p) => String(p.productId) !== String(productId));
        setRandomProducts(filtered.slice(0, 15));
      })
      .catch(() => {});
  }, [productId]);

  useEffect(() => {
    getRelatedProducts(productId, 5)
      .then((list) => setRelatedProducts(list || []))
      .catch(() => {});
  }, [productId]);

  const handleWishlist = async () => {
    if (!currentMemberId) { navigate("/login"); return; }
    setWishLoading(true);
    try {
      if (wishlisted) {
        await removeWishlist(productId);
        setWishlisted(false);
        setProduct((p) => ({ ...p, wishlistCount: p.wishlistCount - 1 }));
      } else {
        try {
          await addWishlist(productId);
          setWishlisted(true);
          setProduct((p) => ({ ...p, wishlistCount: p.wishlistCount + 1 }));
          showToast("위시리스트에 추가했습니다.");
        } catch (e) {
          // W001: 이미 찜한 상품 — 서버와 상태가 어긋난 경우이므로 찜 해제로 동기화
          if (e.code === "W001") {
            setWishlisted(true);
            await removeWishlist(productId);
            setWishlisted(false);
            setProduct((p) => ({ ...p, wishlistCount: Math.max(0, p.wishlistCount - 1) }));
          } else {
            throw e;
          }
        }
      }
    } catch (e) { showToast(e.message); }
    finally { setWishLoading(false); }
  };

  if (loading) return (
    <>
      <Header />
      <div className="pd-loading"><div className="pd-spinner" /></div>
      <Footer />
    </>
  );

  if (error || !product) return (
    <>
      <Header />
      <div className="pd-error">
        <p>{error || "상품을 찾을 수 없습니다."}</p>
        <button className="more-button" onClick={() => window.history.back()}>뒤로가기</button>
      </div>
      <Footer />
    </>
  );

  const isMine = currentMemberId && currentMemberId === product.seller.memberId;
  const isSold = product.productStatus === "SOLD";
  const tags = product.hashtags ? product.hashtags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const gradeClass = product.seller.sellerGrade?.toLowerCase() ?? "bronze";
  const productImageUrls = getProductImageUrls(product);

  return (
    <div className="pd-page">
      <Header />
      <div className="pd-inner">

        {/* ── 메인 2단 ── */}
        <div className="pd-body">

          {/* 왼쪽: 갤러리 + 비슷한 상품 + 판매자 카드 */}
          <div className="pd-left-col">
            <Gallery imageUrls={productImageUrls} title={product.title} brandName={product.brandName} isSold={product.productStatus === "SOLD"} />

            {/* 비슷한 상품 (같은 카테고리) — 갤러리와 판매자 카드 사이 */}
            {relatedProducts.length > 0 && (
              <div className="pd-related-strip">
                <h3 className="pd-related-strip-title">비슷한 상품</h3>
                <div className="pd-related-thumbs">
                  {relatedProducts.slice(0, 4).map((p) => (
                    <button
                      key={p.productId}
                      className="pd-related-thumb"
                      onClick={() => navigate(`/product/${p.productId}`)}
                      aria-label={p.title}
                    >
                      {p.thumbnailUrl
                        ? <img src={p.thumbnailUrl} alt={p.title} />
                        : <div className="pd-related-thumb-noimg" />}
                    </button>
                  ))}
                  <button
                    className="pd-related-more-card"
                    onClick={() => navigate(categoryCodeToUrl(categories, product.categoryCode))}
                  >
                    더보기
                  </button>
                </div>
              </div>
            )}

            {/* ↓↓↓ 수정된 판매자 카드 아바타 ↓↓↓ */}
            <div className="pd-seller-card">
              <div className="pd-seller-avatar">
                <img
                  src={product.seller.profileImageUrl || DEFAULT_PROFILE}
                  alt={`${product.seller.nickname} 프로필`}
                  onError={(e) => { e.target.src = DEFAULT_PROFILE; }}
                />
              </div>
              {/* ↑↑↑ 수정된 판매자 카드 아바타 ↑↑↑ */}
              <div className="pd-seller-info">
                <span className="pd-seller-nickname">{product.seller.nickname}</span>
                <div className="pd-seller-sub">
                  <span className={`up-grade ${gradeClass}`}>{GRADE[product.seller.sellerGrade]}</span>
                  {product.seller.averageRating != null && (
                    <span className="pd-seller-rating">★ {product.seller.averageRating.toFixed(1)}</span>
                  )}
                  <span className="pd-seller-orders">리뷰 {product.seller.reviewCount}건</span>
                </div>
              </div>
              <button className="pd-seller-link" onClick={() => navigate(`/user/${product.seller.memberId}`)}>
                프로필 보기
              </button>
            </div>
          </div>

          {/* 오른쪽: 제목/가격/메타/설명/배송정보 */}
          <div className="pd-info">

            {product.brandName && <p className="pd-brand">{toBrandNameEn(product.brandName)}</p>}

            {/* 제목 + 찜/신고 */}
            <div className="pd-info-top">
              <h1 className="pd-title">{product.title}</h1>
              <div className="pd-info-icons">
                <button
                  className={`pd-icon-btn ${wishlisted ? "on" : ""}`}
                  onClick={handleWishlist}
                  disabled={wishLoading}
                  aria-label={wishlisted ? "찜 취소" : "찜하기"}
                >
                  <svg viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {product.wishlistCount > 0 && <span>{product.wishlistCount}</span>}
                </button>
                {!isMine && (
                  <button
                    className="pd-icon-btn"
                    onClick={() => { if (!currentMemberId) { navigate("/login"); return; } setShowReport(true); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    <span>신고하기</span>
                  </button>
                )}
              </div>
            </div>

            {/* 가격 */}
            <p className="pd-price">{product.price.toLocaleString()}<span className="pd-price-won">원</span></p>

            {/* 사이즈 · 상태 태그 + 시간/찜 수 */}
            <div className="pd-meta-strip">
              <div className="pd-meta-pills">
                {product.size && <span className="pd-strip-pill pd-strip-pill--size">{product.size}</span>}
                {product.conditionCode && (
                  <span className="pd-strip-pill pd-strip-pill--cond">
                    {product.conditionLabel}
                  </span>
                )}
              </div>
              <div className="pd-meta-right">
                <span className="pd-meta-time-sm">{timeAgo(product.createdAt)}</span>
                <span className="pd-meta-dot">·</span>
                <span className="pd-meta-time-sm">조회 {product.viewCount}</span>
              </div>
            </div>

            {/* 안전결제 버튼 */}
            <div className="pd-actions">
              {isMine ? (
                <button className="pd-edit-btn" onClick={() => navigate(`/sell?edit=${product.productId}`)}>
                  수정하기
                </button>
              ) : (
                <button
                  className="pd-buy-btn"
                  onClick={() => {
                    if (!currentMemberId) { navigate('/login'); return; }
                    const savedForm = sessionStorage.getItem('orderForm');
                    if (savedForm) {
                      try {
                        const parsed = JSON.parse(savedForm);
                        if (!parsed._buyerId || parsed._buyerId !== currentMemberId) {
                          sessionStorage.removeItem('orderForm');
                        }
                      } catch {}
                    }
                    sessionStorage.setItem('pendingOrder', JSON.stringify({
                      productId:      product.productId,
                      sellerId:       product.seller.memberId,
                      buyerId:        currentMemberId,
                      productAmount:  product.price,
                      shippingFee:    product.shippingFee || 0,
                      title:          product.title,
                      imageUrl:       productImageUrls[0] ?? '',
                      sellerNickname: product.seller.nickname,
                      sellerBadge:    product.seller.sellerGrade,
                    }));
                    navigate('/order/form');
                  }}
                  disabled={isSold}
                >
                  <img src={shieldIcon} width="15" height="15" alt="shield" style={{filter: 'invert(1)'}} />
                  {isSold ? "판매완료" : "Nailed 안전결제"}
                </button>
              )}
            </div>

            <hr className="pd-info-divider" />

            {/* 상품 설명 */}
            <DescriptionBox text={product.description} />

            {/* 카테고리 + 기간 */}
            <div className="pd-cat-breadcrumb-block">
              <span className="pd-cat-label">카테고리</span>
              <a
                href={categoryCodeToUrl(categories, product.categoryCode)}
                className="pd-cat-breadcrumb"
                onClick={(e) => { e.preventDefault(); navigate(categoryCodeToUrl(categories, product.categoryCode)); }}
              >
                {(product.categoryPath || product.categoryName)?.split(">").map((seg, i, arr) => (
                  <span key={i}>
                    <span className="pd-cat-seg">{seg.trim()}</span>
                    {i < arr.length - 1 && <span className="pd-cat-arrow"> &gt; </span>}
                  </span>
                ))}
              </a>
            </div>

            {/* 해시태그 */}
            {tags.length > 0 && (
              <div className="pd-hashtags">
                {tags.map((t) => <span key={t} className="pd-hashtag">#{t}</span>)}
              </div>
            )}

            {/* 배송정보 */}
            <div className="pd-detail-block">
              <h3 className="pd-detail-block-title">배송정보</h3>
              <div className="pd-ship-box">
                <div className="pd-ship-row">
                  <span className="pd-ship-icon">
                    <img src={deliveryTruck} width="21" height="21" alt="배송방법" />
                  </span>
                  <span className="pd-ship-label">배송방법</span>
                  <span className="pd-ship-value">판매자 직접 배송</span>
                </div>
                <div className="pd-ship-row">
                  <span className="pd-ship-icon">
                    <img src={deliveryBox} width="18" height="18" alt="배송비" />
                  </span>
                  <span className="pd-ship-label">배송비</span>
                  <span className="pd-ship-value">
                    {product.shippingFee > 0 ? `${product.shippingFee.toLocaleString()}원` : "무료"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── 배송 / 환불 아코디언 ── */}
        <SafeSection />

        {/* ── 판매자의 다른 상품 ── */}
        <ProductRowSection
          title={`${product.seller.nickname}의 다른 상품`}
          products={sellerProducts}
        />

        {/* ── 최근 본 상품 ── */}
        <ProductRowSection title="최근 본 상품" products={recentProducts} />

        {/* ── 랜덤 추천 ── */}
        <ProductRowSection title="이런 상품은 어때요?" products={randomProducts} />

      </div>
      <Footer />

      {toast && <div className="pd-toast">{toast}</div>}
      {showReport && (
        <ReportModal
          targetMemberId={product.seller.memberId}
          targetNickname={product.seller.nickname}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

export default ProductDetailPage;
