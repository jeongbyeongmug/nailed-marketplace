import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import Footer from "../components/common/Footer";
import Header from "../components/common/Header";
import { checkNickname } from "../api/authApi";
import { cancelOrder } from "../api/orderApi";
import { fetchMyReports } from "../api/reportApi";
import {
  fetchMyProfile,
  fetchMyProducts,
  fetchOrders,
  fetchSettlements,
  fetchWishlist,
  updateMyProfile,
  uploadMyProfileImage,
  deleteProfileImage,       // ↓ 추가
  withdrawMe,
  fetchAccountInfo,
  updateAccountInfo,
} from "../api/myPageApi";
import { fetchMyInquiries, fetchMyInquiryDetail } from "../api/inquiryApi";
import { getSellerProducts, getUserHome } from "../api/productApi";
import { getSellerReviews, writeReview } from "../api/reviewApi";
import "../styles/review.css";
import "../styles/product-detail.css";
import { API_BASE_URL } from "../api/config";
const DEFAULT_COMMISSION_RATE = 0.02;
const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png"];
const NICKNAME_CHANGE_INTERVAL_DAYS = 30;
const NICKNAME_CHANGED_KEY = "nailed_nickname_changed_at";
const DEFAULT_PROFILE_IMAGE_URL = "";
const SERVER_DEFAULT_PROFILE = "/images/profileImg/default-profile.png";

const GRADE = { BRONZE: "브론즈", SILVER: "실버", GOLD: "골드", DIAMOND: "다이아" };

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function toAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function getProductImageUrl(product) {
  if (product?.thumbnailUrl) return toAssetUrl(product.thumbnailUrl);
  if (product?.imageUrl) return toAssetUrl(product.imageUrl);
  if (Array.isArray(product?.imageUrls)) return toAssetUrl(product.imageUrls.find(Boolean) ?? "");
  return "";
}

function getTabFromPath(pathname) {
  if (pathname === "/mypage/orders") return "orders";
  if (pathname === "/mypage/wishlist") return "wishlist";
  if (pathname === "/mypage/selling") return "selling";
  if (pathname === "/mypage/settlements") return "settlements";
  if (pathname === "/mypage/reviews") return "reviews";
  if (pathname === "/mypage/inquiries") return "inquiries";
  if (pathname === "/mypage/account") return "account";
  if (pathname === "/mypage/withdraw") return "withdraw";
  if (pathname === "/mypage/reports") return "reports";
  return "products";
}

function getPathFromTab(tab) {
  if (tab === "orders") return "/mypage/orders";
  if (tab === "wishlist") return "/mypage/wishlist";
  if (tab === "selling") return "/mypage/selling";
  if (tab === "settlements") return "/mypage/settlements";
  if (tab === "reviews") return "/mypage/reviews";
  if (tab === "inquiries") return "/mypage/inquiries";
  if (tab === "account") return "/mypage/account";
  if (tab === "withdraw") return "/mypage/withdraw";
  if (tab === "reports") return "/mypage/reports";
  return "/mypage";
}

function toList(data) {
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function unwrapApiData(data) {
  return data?.data ?? data ?? {};
}

function readTotalPages(data) {
  return Number(data?.totalPages ?? data?.data?.totalPages ?? 0);
}

function readTotalElements(data) {
  return Number(data?.totalElements ?? data?.data?.totalElements ?? 0);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR");
}

function addDays(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date;
}

function getNicknameChangeKey(memberId) {
  return `${NICKNAME_CHANGED_KEY}:${memberId || "me"}`;
}

function readLocalNicknameChangedAt(memberId) {
  try {
    return localStorage.getItem(getNicknameChangeKey(memberId));
  } catch {
    return "";
  }
}

function saveLocalNicknameChangedAt(memberId) {
  try {
    localStorage.setItem(getNicknameChangeKey(memberId), new Date().toISOString());
  } catch {
    return;
  }
}

function updateSessionNickname(nickname) {
  try {
    const session = JSON.parse(sessionStorage.getItem("nailed_session") || "null");
    if (!session) return;
    sessionStorage.setItem("nailed_session", JSON.stringify({ ...session, nickname }));
    window.dispatchEvent(new Event("storage"));
  } catch {
    return;
  }
}

function getNicknameAvailableDate(seller) {
  const changedAt = seller?.nicknameUpdatedAt || readLocalNicknameChangedAt(seller?.memberId);
  if (!changedAt) return null;
  const availableAt = addDays(changedAt, NICKNAME_CHANGE_INTERVAL_DAYS);
  if (!availableAt || availableAt <= new Date()) return null;
  return availableAt;
}

function formatWon(value) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString()}원`;
}

function normalizeProduct(product) {
  const productStatus = String(product?.productStatus || product?.product_status || "").toUpperCase();
  const orderStatus = String(product?.orderStatus || product?.order_status || "").toUpperCase();
  const isSold = Boolean(product?.isSold) || Boolean(product?.is_sold) || productStatus === "SOLD";

  return {
    ...product,
    productId: product?.productId ?? product?.product_id,
    title: product?.title || product?.productTitle || product?.product_title || "상품명 없음",
    price: Number(product?.price ?? product?.finalPrice ?? product?.final_price ?? 0),
    productStatus,
    orderStatus,
    isSold,
    conditionLabel: product?.conditionLabel || product?.conditionCode || product?.condition_code || "",
    brandName: product?.brandName || product?.brand_name || "",
    size: product?.size || "",
    categoryCode: product?.categoryCode || product?.category_code || "",
    categoryName: product?.categoryName || product?.category_name || "",
    categoryPath: product?.categoryPath || product?.category_path || "",
    wishlistCount: product?.wishlistCount ?? product?.wishlist_count ?? 0,
  };
}

function getProfileImageUrl(profile) {
  return toAssetUrl(profile?.profileImageUrl || DEFAULT_PROFILE_IMAGE_URL);
}

function normalizeOrder(order) {
  return {
    ...order,
    orderId:        order?.orderId || "",
    productId:      order?.productId,
    productTitle:   order?.productTitle || order?.title || "상품명 없음",
    orderStatus:    order.order_status ?? order.orderStatus ?? "",
    previousStatus: order.previous_status ?? order.previousStatus ?? "",
    finalPrice:     Number(order?.finalPrice ?? order?.price ?? 0),
    createdAt:      order?.createdAt || "",
    buyerId:        order?.buyerId || order?.buyer_id || "",
  };
}

function normalizeSettlement(settlement) {
  return {
    ...settlement,
    orderId:                settlement?.orderId || "",
    productId:              settlement?.productId,
    productTitle:           settlement?.productTitle || settlement?.title || "상품명 없음",
    thumbnailUrl:           settlement?.thumbnailUrl || settlement?.imageUrl || "",
    commission:             Number(settlement?.commission ?? 0),
    finalPrice:             Number(settlement?.finalPrice ?? settlement?.price ?? 0),
    sellerSettlementAmount: Number(settlement?.sellerSettlementAmount ?? 0),
    orderStatus:            settlement?.orderStatus || "",
    createdAt:              settlement?.createdAt || "",
    bankCode:               settlement?.bankCode || "",
    accountNumber:          settlement?.accountNumber || "",
    depositorName:          settlement?.depositorName || "",
  };
}

function normalizeInquiry(inquiry) {
  return {
    ...inquiry,
    inquiryId:      inquiry?.inquiryId || "",
    memberId:       inquiry?.memberId || "",
    category:       inquiry?.category || "",
    title:          inquiry?.title || "제목 없음",
    content:        inquiry?.content || "",
    inquiryStatus:  inquiry?.inquiryStatus || "",
    answerContent:  inquiry?.answerContent || "",
    createdAt:      inquiry?.createdAt || "",
    answeredAt:     inquiry?.answeredAt || "",
  };
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

const INQUIRY_CATEGORY_LABELS = {
  ORDER: "주문 문의", PAYMENT: "결제 문의", PRODUCT: "상품 문의",
  DELIVERY: "배송 문의", ACCOUNT: "회원/계정 문의", ETC: "기타 문의",
};

const INQUIRY_STATUS_LABELS = { PENDING: "답변 대기", ANSWERED: "답변 완료" };

function getInquiryCategoryLabel(category) {
  return INQUIRY_CATEGORY_LABELS[category] || category || "-";
}

function getInquiryStatusLabel(status) {
  return INQUIRY_STATUS_LABELS[status] || status || "-";
}

function createSettlementFromSoldProduct(product) {
  const normalized = normalizeProduct(product);
  const commissionPercent = DEFAULT_COMMISSION_RATE * 100;
  const settlementAmount = Math.floor(normalized.price * (1 - DEFAULT_COMMISSION_RATE));

  return normalizeSettlement({
    ...normalized,
    productTitle: normalized.title,
    thumbnailUrl: getProductImageUrl(normalized),
    finalPrice: normalized.price,
    sellerSettlementAmount: normalized.sellerSettlementAmount ?? settlementAmount,
    commission: normalized.commission ?? commissionPercent,
    orderStatus: normalized.orderStatus || normalized.productStatus || "SOLD",
    createdAt: normalized.soldAt || normalized.updatedAt || normalized.createdAt || "",
  });
}

function mergeSettlementsWithSoldProducts(settlements, products) {
  const normalizedSettlements = settlements.map(normalizeSettlement);
  const settlementProductIds = new Set(
    normalizedSettlements.map((s) => s.productId).filter(Boolean).map(String)
  );
  const missingSoldSettlements = products
    .map(normalizeProduct)
    .filter(isSoldProduct)
    .filter((p) => p.productId && !settlementProductIds.has(String(p.productId)))
    .map(createSettlementFromSoldProduct);
  return [...normalizedSettlements, ...missingSoldSettlements];
}

function mapProfileToSeller(profile, fallbackMemberId, counts = {}) {
  const memberId = profile?.memberId || fallbackMemberId || "";
  return {
    memberId,
    userid: profile?.userid || "",
    nickname: profile?.nickname || profile?.userid || memberId || "회원",
    name: profile?.name || "",
    shopInfo: profile?.shopInfo || "",
    profileImageUrl: getProfileImageUrl(profile),
    nicknameUpdatedAt: profile?.nicknameUpdatedAt || profile?.nicknameChangedAt || "",
    sellerGrade: profile?.sellerGrade || "BRONZE",
    completedOrderCount: Number(counts?.soldProductCount ?? counts?.completedOrderCount ?? 0),
    averageRating: null,
  };
}

const PRICE_PRESETS = [
  { label: "5만원 이하",  max: 50000 },
  { label: "10만원 이하", max: 100000 },
  { label: "20만원 이하", max: 200000 },
  { label: "30만원 이하", max: 300000 },
  { label: "50만원 이하", max: 500000 },
];

const PROFILE_TABS = [
  { key: "products",    label: "상품" },
  { key: "wishlist",    label: "위시리스트" },
  { key: "orders",      label: "구매 내역" },
  { key: "selling",     label: "판매 내역" },
  { key: "settlements", label: "정산 내역" },
  { key: "inquiries",   label: "문의 내역" },
  { key: "reports",     label: "신고 내역" },
  { key: "reviews",     label: "리뷰" },
];

/* ── 사이드바 필터 ── */
function FilterSidebar({ filters, onApplyFilters }) {
  const [genderOpen, setGenderOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [draftExcludeSold, setDraftExcludeSold] = useState(filters.excludeSold);
  const [draftGender, setDraftGender] = useState(filters.gender);
  const [minInput, setMinInput] = useState(filters.priceMin ? String(filters.priceMin) : "");
  const [maxInput, setMaxInput] = useState(filters.priceMax ? String(filters.priceMax) : "");

  function applyPreset(max) {
    setMinInput("0");
    setMaxInput(String(max));
  }

  function handleApply() {
    const min = minInput === "" ? 0 : Number(minInput.replace(/,/g, ""));
    const max = maxInput === "" ? 0 : Number(maxInput.replace(/,/g, ""));
    onApplyFilters({ excludeSold: draftExcludeSold, gender: draftGender, priceMin: min, priceMax: max });
  }

  return (
    <aside className="up-sidebar">
      <p className="up-sidebar-title">필터</p>
      <div className="up-filter-check">
        <label>
          <input type="checkbox" checked={draftExcludeSold} onChange={(e) => setDraftExcludeSold(e.target.checked)} />
          품절 상품 제외
        </label>
      </div>
      <div className="up-filter-group">
        <button className="up-filter-head" onClick={() => setGenderOpen((o) => !o)}>
          성별 <span className={`up-filter-arrow ${genderOpen ? "open" : ""}`}>›</span>
        </button>
        {genderOpen && (
          <ul className="up-filter-list">
            {[{ value: "all", label: "전체" }, { value: "mens", label: "남성" }, { value: "womens", label: "여성" }].map(({ value, label }) => (
              <li key={value}>
                <label>
                  <input type="radio" name="up-gender-filter" checked={draftGender === value} onChange={() => setDraftGender(value)} />
                  {label}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="up-filter-group">
        <button className="up-filter-head" onClick={() => setPriceOpen((o) => !o)}>
          가격 <span className={`up-filter-arrow ${priceOpen ? "open" : ""}`}>›</span>
        </button>
        {priceOpen && (
          <div className="up-price-body">
            <div className="up-price-range">
              <input className="up-price-input" type="number" placeholder="0" value={minInput} onChange={(e) => setMinInput(e.target.value)} min={0} />
              <span className="up-price-dash">-</span>
              <input className="up-price-input" type="number" placeholder="0" value={maxInput} onChange={(e) => setMaxInput(e.target.value)} min={0} />
            </div>
            <ul className="up-price-presets">
              {PRICE_PRESETS.map(({ label, max }) => (
                <li key={max}><button className="up-price-preset-btn" onClick={() => applyPreset(max)}>{label}</button></li>
              ))}
            </ul>
            <button className="up-price-apply" onClick={handleApply}>적용</button>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── 상품 탭 ── */
function ProductsTab({ products, emptyMessage = "조건에 맞는 상품이 없습니다.", showOrderButton = false, orderIdMap = {} }) {
  const [filters, setFilters] = useState({ excludeSold: false, gender: "all", priceMin: 0, priceMax: 0 });
  const [visible, setVisible] = useState(12);

  const filtered = products.map(normalizeProduct)
  .filter((p) => !p.isSold)
    .filter((p) => filters.gender === "all" || matchesGender(p, filters.gender))
    .filter((p) => filters.priceMin === 0 || p.price >= filters.priceMin)
    .filter((p) => filters.priceMax === 0 || p.price <= filters.priceMax);

  const shown = filtered.slice(0, visible);

  return (
    <div className="up-tab-layout">
      <FilterSidebar filters={filters} onApplyFilters={(nextFilters) => { setFilters(nextFilters); setVisible(12); }} />
      <div className="up-products-main">
        <div className="up-sort-row">
          <span className="up-count">전체 <strong>{filtered.length}</strong>개</span>
        </div>
        {filtered.length === 0 ? (
          <p className="up-empty">{emptyMessage}</p>
        ) : (
          <>
            <div className="up-product-grid">
              {shown.map((p) => (
                <article key={p.productId} className="up-card" onClick={() => navigate(`/product/${p.productId}`)}>
                  <div className="up-card-img-wrap">
                    {getProductImageUrl(p) && (
                      <div className="product-visual">
                        <img className="product-image" src={getProductImageUrl(p)} alt={p.title} />
                      </div>
                    )}
                    {p.isSold && <div className="up-card-sold">SOLD</div>}
                    <div className="product-heart-btn" onClick={(e) => e.stopPropagation()}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      <span className="product-heart-count">{p.wishlistCount}</span>
                    </div>
                  </div>
                  <div className="up-card-body">
                    {(p.brandName || p.size) && (
                      <div className="up-card-meta">
                        {p.brandName && <span className="up-card-brand">{p.brandName}</span>}
                        {p.size && <span className="up-card-size">{p.size}</span>}
                      </div>
                    )}
                    <p className="up-card-name">{p.title}</p>
                    <p className="up-card-price">{p.price.toLocaleString()}원</p>
                    {showOrderButton && (
                      <button
                        style={{ marginTop: "8px", width: "100%", padding: "7px 0", background: "#168f88", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em" }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/order/detail/${orderIdMap[p.productId] ?? p.productId}`); }}
                      >
                        주문 상세
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {visible < filtered.length && (
              <button className="up-load-more" onClick={() => setVisible((v) => v + 12)}>더 많은 상품 보기</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function isSoldProduct(product) {
  const productStatus = String(product?.productStatus || product?.product_status || "").toUpperCase();
  return Boolean(product?.isSold) || Boolean(product?.is_sold) || productStatus === "SOLD";
}

function matchesGender(product, gender) {
  const categoryCode = String(product?.categoryCode || "").toUpperCase();
  const categoryText = [categoryCode, product?.categoryName, product?.categoryPath].filter(Boolean).join(" ").toUpperCase();
  if (gender === "mens") return categoryCode.startsWith("MENS") || categoryText.includes("남성") || categoryText.includes("맨즈");
  if (gender === "womens") return categoryCode.startsWith("WOMENS") || categoryText.includes("여성") || categoryText.includes("우먼");
  return true;
}

/* ── 주문 내역 탭 ── */
function OrdersTab({ orders, onCancelOrder, onWriteReview }) {
  const session = JSON.parse(sessionStorage.getItem("nailed_session") || "null");
  const myMemberId = String(session?.member_id ?? session?.memberId ?? "");

  const normalizedOrders = orders.map(normalizeOrder).filter((o) => o.orderStatus !== "CANCELLED");
  if (normalizedOrders.length === 0) return <p className="up-empty">주문 내역 정보가 없습니다.</p>;

  const STATUS_LABEL = { REQUESTED: "주문접수", PAID: "결제완료", SHIPPING: "배송중", DELIVERED: "배송완료", CANCELLED: "취소됨" };

  return (
    <div className="up-buy-order-list">
      {normalizedOrders.map((order) => {
        const imageUrl = getProductImageUrl(order);
        const isDelivered = order.orderStatus === "DELIVERED";

        const buyerIdStr = String(order.buyerId || order.buyer_id || "");
        const isBuyer = myMemberId && (
          myMemberId === buyerIdStr ||
          myMemberId === buyerIdStr.replace("MEMBER_", "") ||
          `MEMBER_${myMemberId}` === buyerIdStr
        );
        const canReview = isDelivered && (isBuyer || myMemberId === "") && !order.hasReview;

        return (
          <div key={order.orderId || order.productId} className="up-order-card-col">
            <div className="up-order-card-img-wrap">
              {imageUrl
                ? <img src={imageUrl} alt={order.productTitle} />
                : <div className="up-order-card-img-empty">상품<br/>이미지</div>
              }
            </div>
            <div className="up-order-card-info">
              <p className="up-order-card-title">{order.productTitle}</p>
              <div className="up-order-card-status-row">
                <span className="up-order-card-meta" style={{ margin: 0 }}>
                  주문번호: {order.orderId || "-"}
                </span>
                {canReview && (
                  <button className="up-order-card-review-inline-btn"
                    onClick={() => onWriteReview(order)}>
                    리뷰 작성
                  </button>
                )}
                {isDelivered && order.hasReview && (
                  <span className="up-order-card-reviewed-inline">리뷰 완료</span>
                )}
              </div>
              <p className="up-order-card-meta">상태: {STATUS_LABEL[order.orderStatus] || order.orderStatus || "-"}</p>
              <p className="up-order-card-price">{formatWon(order.finalPrice)}</p>
              <div className="up-order-card-btns">
                <button className="up-order-card-detail-btn"
                  onClick={() => navigate(`/order/detail/${order.orderId}`)}>
                  주문 상세
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 판매 내역 탭 ── */
function SellingTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders(0, 50, "SELL")
      .then((data) => {
        const filtered = toList(data).map(normalizeOrder).filter((o) => ["PAID", "REQUESTED", "SHIPPING", "DELIVERED"].includes(o.orderStatus));
        setOrders(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const STATUS_LABEL = { REQUESTED: "주문접수", PAID: "결제완료", SHIPPING: "배송중", DELIVERED: "배송완료", CANCELLED: "취소됨" };

  if (loading) return <p className="up-empty">불러오는 중...</p>;
  if (orders.length === 0) return <p className="up-empty">판매한 상품이 없습니다.</p>;

  return (
    <div className="up-product-grid">
      {orders.map((o) => {
        const imageUrl = getProductImageUrl(o);
        return (
          <article key={o.orderId || o.productId} className="up-card" onClick={() => navigate(`/product/${o.productId}`)}>
            <div className="up-card-img-wrap">
              {imageUrl
                ? <div className="product-visual"><img className="product-image" src={imageUrl} alt={o.productTitle} /></div>
                : <div className="product-visual" style={{ background: "#eef2f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: "12px" }}>NO IMAGE</div>
              }
              {o.orderStatus === "DELIVERED" && <div className="up-card-sold">SOLD</div>}
            </div>
            <div className="up-card-body">
              <p className="up-card-name">{o.productTitle}</p>
              <p className="up-card-name" style={{ fontSize: "11px", color: "#69717d", fontWeight: 600 }}>주문번호: {o.orderId || "-"}</p>
              <p className="up-card-name" style={{ fontSize: "11px", color: "#69717d", fontWeight: 600 }}>상태: {STATUS_LABEL[o.orderStatus] || o.orderStatus || "-"}</p>
              <p className="up-card-price">{formatWon(o.finalPrice)}</p>
              {o.orderStatus === "PAID" && (
                <button style={{ marginTop: "8px", width: "100%", padding: "7px 0", background: "#168f88", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/order/detail/${o.orderId}`); }}>주문 상세</button>
              )}
              {o.orderStatus === "REQUESTED" && (
                <button style={{ marginTop: "8px", width: "100%", padding: "7px 0", background: "#168f88", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/order/detail/${o.orderId}`); }}>운송장 등록</button>
              )}
              {o.orderStatus === "SHIPPING" && (
                <button style={{ marginTop: "8px", width: "100%", padding: "7px 0", background: "#fff", color: "#168f88", border: "1.5px solid #168f88", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/order/detail/${o.orderId}`); }}>운송장 조회하기</button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ── 정산 내역 탭 ── */
function SettlementTab({ settlements }) {
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawDone, setWithdrawDone] = useState(false);

  const [withdrawn, setWithdrawn] = useState(() => {
    try {
      const session = JSON.parse(sessionStorage.getItem("nailed_session") || "null");
      const memberId = session?.member_id ?? session?.memberId ?? "unknown";
      return localStorage.getItem(`nailed_withdrawn_${memberId}`) === "true";
    } catch {
      return false;
    }
  });

  const normalizedSettlements = settlements
    .map(normalizeSettlement)
    .filter((s) => ["SHIPPING", "DELIVERED"].includes(s.orderStatus));

  const withdrawableAmount = withdrawn ? 0 : normalizedSettlements
    .filter((s) => s.orderStatus === "DELIVERED")
    .reduce((sum, s) => sum + s.sellerSettlementAmount, 0);

  async function handleWithdraw() {
    if (withdrawableAmount <= 0) { alert("출금 가능한 금액이 없습니다."); return; }
    if (!window.confirm(`${formatWon(withdrawableAmount)}을 출금 신청하시겠습니까?`)) return;
    setWithdrawLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const session = JSON.parse(sessionStorage.getItem("nailed_session") || "null");
      const memberId = session?.member_id ?? session?.memberId ?? "unknown";
      localStorage.setItem(`nailed_withdrawn_${memberId}`, "true");
      setWithdrawDone(true);
      setWithdrawn(true);
      setTimeout(() => setWithdrawDone(false), 3000);
    } catch {
      alert("출금 신청에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setWithdrawLoading(false);
    }
  }

  function groupByMonth(list) {
    const groups = {};
    list.forEach((s) => {
      const date = s.createdAt ? new Date(s.createdAt) : null;
      const key = date && !isNaN(date)
        ? `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월`
        : "날짜 없음";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }

  const sorted = [...normalizedSettlements]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const grouped = groupByMonth(sorted);

  const getStatusText = (s) => {
    if (s.orderStatus === "DELIVERED") return "입금완료";
    if (s.orderStatus === "SHIPPING")  return "입금예정";
    return "-";
  };

  const getStatusColor = (s) => {
    if (s.orderStatus === "DELIVERED") return "#168f88";
    return "#1565c0";
  };

  const BANK_LABELS = { KB: "국민은행", SHINHAN: "신한은행", WOORI: "우리은행"};

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#f4faf9", border: "1px solid #c8e6e4", borderRadius: "10px",
        padding: "10px 16px", marginBottom: "24px",
      }}>
        <div>
          <p style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>출금 가능 금액</p>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#168f88" }}>{formatWon(withdrawableAmount)}</p>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={withdrawLoading || withdrawableAmount <= 0}
          style={{
            padding: "7px 16px",
            background: withdrawableAmount > 0 ? "#168f88" : "#ccc",
            color: "#fff", border: "none", borderRadius: "8px",
            fontSize: "13px", fontWeight: 700,
            cursor: withdrawableAmount > 0 ? "pointer" : "not-allowed",
          }}
        >
          {withdrawDone ? "신청 완료 ✓" : withdrawLoading ? "처리 중..." : "출금 신청"}
        </button>
      </div>

      {normalizedSettlements.length === 0 ? (
        <p className="up-empty">정산 내역 정보가 없습니다.</p>
      ) : (
        Object.entries(grouped).map(([month, items]) => (
          <div key={month} style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#222", marginBottom: "12px" }}>
              {month}
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {items.map((s) => {
                const imageUrl = getProductImageUrl(s);
                const date = s.createdAt ? new Date(s.createdAt) : null;
                const dateStr = date && !isNaN(date)
                  ? `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
                  : "";
                const bankLabel = BANK_LABELS[s.bankCode] || s.bankCode || "";
                const accountLine = s.accountNumber
                  ? `${s.accountNumber}${bankLabel ? " " + bankLabel : ""}`
                  : `수수료 ${s.commission ?? 0}% · 결제금액 ${formatWon(s.finalPrice)}`;

                return (
                  <div
                    key={s.orderId || s.productId}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 0", borderBottom: "1px solid #f0f0f0",
                      cursor: s.productId ? "pointer" : "default",
                    }}
                    onClick={() => s.productId && navigate(`/product/${s.productId}`)}
                  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, background: "#eee" }}>
                      {imageUrl
                        ? <img src={imageUrl} alt={s.productTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#aaa" }}>NO IMG</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#222", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.productTitle}
                      </p>
                      <p style={{ fontSize: "12px", color: "#999" }}>{accountLine}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#222", marginBottom: "2px" }}>
                        {formatWon(s.sellerSettlementAmount)}
                      </p>
                      <p style={{ fontSize: "12px", color: getStatusColor(s) }}>
                        {dateStr && `${dateStr} `}{getStatusText(s)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── 프로필 수정 모달 ── */
function ProfileSettingsModal({ seller, onClose, onSave, onDeleteImage }) {
  const fileInputRef = useRef(null);
  const [shopInfo, setShopInfo] = useState(seller.shopInfo || "");
  const [profilePreview, setProfilePreview] = useState(seller.profileImageUrl || "");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreviewFailed, setProfilePreviewFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) { alert("jpg/png 파일만 선택할 수 있습니다."); event.target.value = ""; return; }
    if (file.size > PROFILE_IMAGE_MAX_SIZE) { alert("파일 크기는 최대 5MB까지 가능합니다."); event.target.value = ""; return; }
    setProfilePreview(URL.createObjectURL(file));
    setProfilePreviewFailed(false);
    setProfileFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      await onSave({ shopInfo: shopInfo.trim(), profileFile });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="up-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="up-profile-modal" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="up-modal-head">
          <h2>프로필 수정</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {seller.profileImageUrl && seller.profileImageUrl !== toAssetUrl(SERVER_DEFAULT_PROFILE) && (
              <button type="button" className="up-profile-edit-btn" onClick={async () => { await onDeleteImage(); onClose(); }}>
                사진 삭제
              </button>
            )}
            <button type="button" className="up-modal-close" onClick={onClose} aria-label="닫기">×</button>
          </div>
        </div>
        <button type="button" className="up-edit-avatar" onClick={() => fileInputRef.current?.click()} aria-label="프로필 이미지 선택">
          {profilePreview && !profilePreviewFailed
            ? <img src={profilePreview} alt="" onError={() => setProfilePreviewFailed(true)} />
            : <span>{seller.nickname.charAt(0)}</span>
          }
        </button>
        <input ref={fileInputRef} type="file" className="up-hidden-file" accept="image/jpeg,image/png" onChange={handleImageChange} />
        <label className="up-edit-field">
          <span>상점 정보</span>
          <textarea value={shopInfo} onChange={(event) => setShopInfo(event.target.value.slice(0, 80))} rows={5} maxLength={80} placeholder="상점 소개를 입력하세요." />
        </label>
        <p className="up-edit-help">{shopInfo.length}/80</p>
        <button type="submit" className="up-save-profile" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
      </form>
    </div>
  );
}

/* ── 리뷰 작성 모달 ── */
function ReviewWriteModal({ order, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (rating === 0) { alert("별점을 선택해주세요."); return; }
    setSaving(true);
    try {
      await writeReview({ orderId: order.orderId, rating, content: content.trim() || null });
      alert("리뷰가 등록되었습니다.");
      onSaved();
    } catch (error) {
      alert(error.message || "리뷰 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const imageUrl = getProductImageUrl(order);
  const displayRating = hoverRating || rating;

  return (
    <div className="up-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="up-review-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="up-modal-head">
          <h2>리뷰 작성</h2>
          <button type="button" className="up-modal-close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className="up-review-product-row">
          <div className="up-review-product-img">
            {imageUrl
              ? <img src={imageUrl} alt={order.productTitle} />
              : <div className="up-review-product-img-empty">상품<br/>이미지</div>
            }
          </div>
          <div className="up-review-product-info">
            <p className="up-review-product-label">구매 상품</p>
            <p className="up-review-product-title">{order.productTitle}</p>
            <p className="up-review-product-price">{formatWon(order.finalPrice)}</p>
          </div>
        </div>
        <div className="up-review-rating-section">
          <p className="up-review-section-label">상품 만족도</p>
          <p className="up-review-rating-question">상품은 어떠셨나요?</p>
          <div className="up-review-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`up-review-star ${displayRating >= star ? "active" : ""}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                aria-label={`${star}점`}
              >★</button>
            ))}
          </div>
          <p className="up-review-rating-hint">
            {displayRating > 0
              ? ["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "최고예요"][displayRating]
              : "별점을 선택해 주세요"}
          </p>
        </div>
        <div className="up-review-content-section">
          <p className="up-review-section-label">후기 작성</p>
          <textarea
            className="up-review-textarea"
            placeholder="상태, 사이즈, 거래 경험 등 솔직한 후기를 남겨주세요. (최대 500자)"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            rows={5}
          />
          <p className="up-review-char-count">{content.length} / 500</p>
        </div>
        <button
          type="button"
          className={`up-review-submit ${rating > 0 ? "active" : ""}`}
          onClick={handleSubmit}
          disabled={saving || rating === 0}
        >
          {saving ? "등록 중..." : "리뷰 등록"}
        </button>
      </div>
    </div>
  );
}

/* ── 리뷰 탭 ── */
function ReviewsTab({ reviews, totalPages, page, setPage, rvLoading }) {
  return (
    <div className="up-reviews-wrap">
      {reviews.length === 0 && !rvLoading && (
        <p className="up-empty">아직 받은 리뷰가 없습니다.</p>
      )}
      <ul className="rv-list">
        {reviews.map((r) => (
          <li key={r.reviewId} className="rv-item">
            {r.productTitle && (
              <div
                style={{
                  display: 'flex', gap: '10px', alignItems: 'center',
                  padding: '8px', background: '#f8f9fa', borderRadius: '8px',
                  marginBottom: '10px', cursor: 'pointer'
                }}
                onClick={() => r.productId && navigate(`/product/${r.productId}`)}
              >
                {r.productImageUrl && (
                  <img
                    src={toAssetUrl(r.productImageUrl)}
                    alt={r.productTitle}
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                  />
                )}
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px' }}>{r.productTitle}</p>
                  {r.price && (
                    <p style={{ fontSize: '12px', color: '#168f88', margin: 0 }}>
                      {Number(r.price).toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="rv-item-header">
              <div className="rv-avatar">{r.buyerNickname.charAt(0)}</div>
              <div>
                <span className="rv-buyer">{r.buyerNickname}</span>
                <span className="rv-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              <span className="rv-date">{new Date(r.createdAt).toLocaleDateString("ko-KR")}</span>
            </div>
            {r.content && <p className="rv-content">{r.content}</p>}
          </li>
        ))}
      </ul>
      {page < totalPages - 1 && (
        <button className="rv-load-more" onClick={() => setPage((p) => p + 1)} disabled={rvLoading}>
          {rvLoading ? "불러오는 중..." : "리뷰 더보기"}
        </button>
      )}
    </div>
  );
}

/* ── 문의 내역 탭 ── */
function InquiriesTab({ inquiries, selectedInquiry, detailLoading, onSelectInquiry }) {
  const [openId, setOpenId] = useState(null);

  if (inquiries.length === 0) return <p className="up-empty">등록된 문의 내역이 없습니다.</p>;

  function handleClick(inquiryId) {
    if (openId === inquiryId) { setOpenId(null); } else { setOpenId(inquiryId); onSelectInquiry(inquiryId); }
  }

  return (
    <div className="up-inquiry-list" aria-label="1:1 문의 내역">
      {inquiries.map((inquiry) => {
        const isOpen = openId === inquiry.inquiryId;
        const detail = selectedInquiry?.inquiryId === inquiry.inquiryId ? selectedInquiry : null;
        return (
          <div key={inquiry.inquiryId} className="up-inquiry-item" style={{ cursor: "pointer" }} onClick={() => handleClick(inquiry.inquiryId)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span className="up-inquiry-category">{getInquiryCategoryLabel(inquiry.category)}</span>
              <strong>{inquiry.title}</strong>
              <span className={`up-inquiry-status ${inquiry.inquiryStatus === "ANSWERED" ? "answered" : ""}`}>{getInquiryStatusLabel(inquiry.inquiryStatus)}</span>
              <span style={{ marginLeft: "auto", fontSize: "12px", color: "#aaa" }}>{isOpen ? "▲" : "▼"}</span>
            </div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span className="up-inquiry-date">작성일 {formatDateTime(inquiry.createdAt)}</span>
              <span className="up-inquiry-date">답변일 {formatDateTime(inquiry.answeredAt)}</span>
            </div>
            {isOpen && (
              <div style={{ marginTop: "12px", padding: "12px", background: "#f8f9fa", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {detailLoading && detail === null ? (
                  <p style={{ fontSize: "13px", color: "#888" }}>불러오는 중...</p>
                ) : detail ? (
                  <>
                    <div><span style={{ color: "#888", fontSize: "12px" }}>문의 내용</span> <span style={{ fontSize: "13px" }}>{detail.content || "-"}</span></div>
                    <div>
                      <span style={{ color: "#888", fontSize: "12px" }}>답변 내용</span>{" "}
                      <span style={{ fontSize: "13px" }}>
                        {detail.inquiryStatus === "ANSWERED" && detail.answerContent ? detail.answerContent : "아직 답변이 등록되지 않았습니다."}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 신고 내역 탭 ── */
function ReportsTab({ reports }) {
  const REASON_LABELS = {
    FRAUD: "사기",
    MISLEADING_INFO: "상품 정보 허위/불일치",
    PROHIBITED_ITEM: "금지상품",
    ETC: "기타",
  };
  const STATUS_LABELS = {
    PENDING:  { text: "처리 중",  color: "#1565c0", bg: "#e3f2fd" },
    APPROVED: { text: "승인",     color: "#2e7d32", bg: "#e8f5e9" },
    REJECTED: { text: "반려",     color: "#c62828", bg: "#fdecea" },
    DONE:     { text: "처리 완료", color: "#555",   bg: "#f5f5f5" },
  };

  const [openId, setOpenId] = useState(null);

  if (reports.length === 0) return <p className="up-empty">신고 내역이 없습니다.</p>;

  return (
    <div className="up-inquiry-list" aria-label="신고 내역">
      {reports.map((r) => {
        const badge = STATUS_LABELS[r.reportStatus] || { text: r.reportStatus, color: "#555", bg: "#f5f5f5" };
        const isOpen = openId === r.reportId;
        return (
          <div key={r.reportId} className="up-inquiry-item" style={{ cursor: "pointer" }}
            onClick={() => setOpenId(isOpen ? null : r.reportId)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <strong>@{r.targetNickname || r.targetMemberId}</strong>
              <span style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: 600,
                background: badge.bg,
                color: badge.color,
              }}>
                {badge.text}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "12px", color: "#aaa" }}>{isOpen ? "▲" : "▼"}</span>
            </div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span className="up-inquiry-category">{REASON_LABELS[r.reasonCode] || r.reasonCode}</span>
              <span className="up-inquiry-date">신고일 {formatDateTime(r.createdAt)}</span>
            </div>
            {isOpen && (
              <div style={{ marginTop: "12px", padding: "12px", background: "#f8f9fa", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                <div><span style={{ color: "#888", fontSize: "12px" }}>신고 사유</span> <span style={{ fontSize: "13px" }}>{REASON_LABELS[r.reasonCode] || r.reasonCode}</span></div>
                <div><span style={{ color: "#888", fontSize: "12px" }}>신고 내용</span> <span style={{ fontSize: "13px" }}>{r.detail || "-"}</span></div>
                {r.processedReason && (
                  <div><span style={{ color: "#888", fontSize: "12px" }}>처리 사유</span> <span style={{ fontSize: "13px" }}>{r.processedReason}</span></div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyProfileTab({ label }) {
  return <p className="up-empty">{label} 정보가 없습니다.</p>;
}

/* ── 계좌 관리 탭 ── */
function AccountTab() {
  const BANK_OPTIONS = [
    { value: "",       label: "은행 선택" },
    { value: "KB",     label: "KB국민" },
    { value: "SHINHAN",label: "신한" },
    { value: "WOORI",  label: "우리" },
  ];
  const BANK_LABELS = { KB: "KB국민은행", SHINHAN: "신한은행", WOORI: "우리은행" };

  const [accountForm, setAccountForm] = useState({ bankCode: "", accountNumber: "", depositorName: "" });
  const [savedAccount, setSavedAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);

  useEffect(() => {
    fetchAccountInfo().then((data) => {
      if (data?.bankCode) {
        setSavedAccount({ bankCode: data.bankCode, accountNumber: data.accountNumber, depositorName: data.depositorName });
        setAccountForm({ bankCode: data.bankCode, accountNumber: data.accountNumber || "", depositorName: data.depositorName || "" });
      } else {
        setIsEditing(true);
      }
    }).catch(() => { setIsEditing(true); });
  }, []);

  async function handleAccountSave() {
    if (!accountForm.bankCode || !accountForm.accountNumber || !accountForm.depositorName) { alert("모든 항목을 입력해주세요."); return; }
    setAccountLoading(true);
    try {
      await updateAccountInfo(accountForm);
      setSavedAccount({ ...accountForm });
      setAccountSaved(true);
      setIsEditing(false);
      setTimeout(() => setAccountSaved(false), 2000);
    } catch {
      alert("저장 실패. 다시 시도해주세요.");
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("계좌 정보를 삭제하시겠습니까?")) return;
    setAccountLoading(true);
    try {
      await updateAccountInfo({ bankCode: null, accountNumber: null, depositorName: null });
      setSavedAccount(null);
      setAccountForm({ bankCode: "", accountNumber: "", depositorName: "" });
      setIsEditing(true);
    } catch {
      alert("삭제 실패. 다시 시도해주세요.");
    } finally {
      setAccountLoading(false);
    }
  }

  return (
    <div className="up-account-tab">
      <section className="up-account-card">
        <h3>계좌 관리</h3>
        {savedAccount && !isEditing ? (
          <div className="up-account-saved">
            <div className="up-account-saved-info">
              <span className="up-account-bank-name">{BANK_LABELS[savedAccount.bankCode] || savedAccount.bankCode}</span>
            </div>
            <p className="up-account-number">{savedAccount.accountNumber} · {savedAccount.depositorName}</p>
            <div className="up-account-actions">
              <button className="up-account-edit-btn" onClick={() => setIsEditing(true)}>수정</button>
              <span className="up-account-divider">|</span>
              <button className="up-account-delete-btn" onClick={handleDelete} disabled={accountLoading}>삭제</button>
            </div>
          </div>
        ) : (
          <div className="up-account-form">
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" }}>
              <tbody>
                <tr>
                  <td style={{ width: "80px", color: "#555", fontSize: "13px", fontWeight: 600, paddingRight: "12px" }}>은행</td>
                  <td>
                    <select style={{ height: "36px", padding: "0 8px", border: "1px solid #cfd8e3", borderRadius: "6px", fontSize: "13px" }}
                      value={accountForm.bankCode} onChange={(e) => setAccountForm({ ...accountForm, bankCode: e.target.value })}>
                      {BANK_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#555", fontSize: "13px", fontWeight: 600, paddingRight: "12px" }}>계좌번호</td>
                  <td>
                    <input type="text" placeholder="계좌번호 입력"
                      style={{ height: "36px", padding: "0 10px", border: "1px solid #f7f9fa", borderRadius: "6px", fontSize: "13px", width: "100%" }}
                      value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} />
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#555", fontSize: "13px", fontWeight: 600, paddingRight: "12px" }}>예금주</td>
                  <td>
                    <input
                      type="text"
                      placeholder="예금주명 입력"
                      value={accountForm.depositorName}
                      readOnly
                      style={{ height: "36px", padding: "0 10px", border: "1px solid #cfd8e3", borderRadius: "6px", fontSize: "13px", width: "100%", background: "#fff", color: "#151515", cursor: "not-allowed" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td style={{ paddingTop: "6px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="up-btn-save" onClick={handleAccountSave} disabled={accountLoading}
                        style={{ height: "36px", padding: "0 20px", background: "#168f88", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        {accountSaved ? "저장됨 ✓" : accountLoading ? "저장 중..." : "저장"}
                      </button>
                      {savedAccount && (
                        <button className="up-account-cancel-btn"
                          onClick={() => { setAccountForm({ ...savedAccount }); setIsEditing(false); }}
                          style={{ height: "36px", padding: "0 16px", border: "1px solid #d4d4d4", borderRadius: "6px", background: "#fff", color: "#333", fontSize: "13px", cursor: "pointer" }}>
                          취소
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── 회원 탈퇴 탭 ── */
function WithdrawTab({ onWithdraw }) {
  return (
    <div className="up-account-tab">
      <section className="up-account-card">
        <div className="up-withdraw-box">
          <p className="up-withdraw-title">회원 탈퇴</p>
          <p className="up-withdraw-desc">회원 탈퇴 시 계정 상태가 탈퇴 처리되며, 다시 로그인할 수 없습니다.</p>
          <button type="button" className="up-withdraw-btn" onClick={onWithdraw}>회원 탈퇴</button>
        </div>
      </section>
    </div>
  );
}

/* ── 메인 페이지 ── */
function UserProfilePage({ memberId, hideFooter = false, onNavigate, pathname = "/mypage" }) {
  const [seller, setSeller] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sellOrderMap, setSellOrderMap] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [rvLoading, setRvLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const [toast, setToast] = useState("");
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [reviewModalOrder, setReviewModalOrder] = useState(null);
  const timerRef = useRef(null);
  const currentTab = hideFooter ? getTabFromPath(pathname) : activeTab;
  const profileTabs = hideFooter ? PROFILE_TABS : PROFILE_TABS.filter((tab) => tab.key !== "inquiries");

  function showToast(msg) {
    setToast(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(""), 2400);
  }

  async function handleDeleteProfileImage() {
    if (!window.confirm("프로필 사진을 삭제할까요?")) return;
    try {
      await deleteProfileImage();
      setSeller((prev) => prev ? { ...prev, profileImageUrl: toAssetUrl(SERVER_DEFAULT_PROFILE) } : prev);
    } catch {
      showToast("프로필 사진 삭제에 실패했습니다.");
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (hideFooter) {
        try {
          const profile = await fetchMyProfile();
          const home = await getUserHome(profile?.memberId || memberId);
          if (!ignore) setSeller(mapProfileToSeller(home?.profile || profile, memberId, home));
          try {
            const rvData = await getSellerReviews(profile?.memberId || memberId, 0, 1);
            const reviewPage = rvData?.reviews ?? rvData?.data?.reviews ?? {};
            if (!ignore) {
              setAvgRating(rvData?.averageRating ?? rvData?.data?.averageRating ?? null);
              setTotalElements(readTotalElements(reviewPage));
            }
          } catch (_) {}
        } catch (error) {
          if (!ignore) {
            showToast(error.message || "프로필 정보를 불러올 수 없습니다.");
            setSeller(mapProfileToSeller(null, memberId));
          }
        }
        return;
      }

      try {
        const [home, products] = await Promise.all([getUserHome(memberId), getSellerProducts(memberId)]);
        if (!ignore) {
          setSeller(mapProfileToSeller(home?.profile, memberId, home));
          setSellerProducts(toList(products).map(normalizeProduct));
        }
      } catch (error) {
        if (!ignore) {
          showToast(error.message || "판매 상품을 불러올 수 없습니다.");
          setSeller({ memberId, nickname: memberId, sellerGrade: "BRONZE", completedOrderCount: 0, averageRating: null });
          setSellerProducts([]);
        }
      }
    }

    loadProfile();
    return () => { ignore = true; clearTimeout(timerRef.current); };
  }, [hideFooter, memberId]);

  useEffect(() => {
    if (hideFooter) return;
    setPage(0);
    setReviews([]);
  }, [hideFooter, memberId]);

  useEffect(() => {
    if (!hideFooter) return;
    let ignore = false;

    async function loadTabData() {
      try {
        setTabLoading(true);

        if (currentTab === "products") {
          const data = await fetchMyProducts(0, 15);
          if (!ignore) { const list = toList(data).map(normalizeProduct); setMyProducts(list); setSellerProducts(list); }
        }
        if (currentTab === "selling") {
          try {
            const sellData = await fetchOrders(0, 50, "SELL");
            if (!ignore) {
              const map = {};
              toList(sellData).forEach((o) => { if (o.productId && o.orderId) map[o.productId] = o.orderId; });
              setSellOrderMap(map);
            }
          } catch (_) {}
        }
        if (currentTab === "orders") {
          const data = await fetchOrders(0, 15, "BUY");
          if (!ignore) setOrders(toList(data).map(normalizeOrder).filter((o) => o.orderStatus !== "CANCELLED"));
        }
        if (currentTab === "wishlist") {
          const data = await fetchWishlist(0, 15);
          if (!ignore) setWishlist(toList(data).map(normalizeProduct));
        }
        if (currentTab === "settlements") {
          const data = await fetchSettlements(0, 20);
          if (!ignore) setSettlements(toList(data).map(normalizeSettlement));
        }
        if (currentTab === "inquiries") {
          const data = await fetchMyInquiries(0, 10);
          if (!ignore) { setInquiries(toList(data).map(normalizeInquiry)); setSelectedInquiry(null); }
        }
        if (currentTab === "reports") {
          const data = await fetchMyReports(0, 20);
          if (!ignore) setReports(toList(data));
        }
      } catch (error) {
        if (!ignore) showToast(error.message || "목록을 불러올 수 없습니다.");
      } finally {
        if (!ignore) setTabLoading(false);
      }
    }

    loadTabData();
    return () => { ignore = true; };
  }, [hideFooter, currentTab]);

  async function handleSelectInquiry(inquiryId) {
    if (!inquiryId) return;
    try {
      setDetailLoading(true);
      const data = await fetchMyInquiryDetail(inquiryId);
      setSelectedInquiry(normalizeInquiry(data));
    } catch (error) {
      showToast(error.message || "문의 상세를 불러올 수 없습니다.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCancelOrder(orderId) {
    if (!window.confirm("이 주문을 취소하시겠습니까?")) return;
    const session = JSON.parse(sessionStorage.getItem("nailed_session") || "null");
    const buyerId = session?.member_id ?? session?.memberId ?? null;
    if (!buyerId) { showToast("로그인이 필요합니다."); return; }
    try {
      const result = await cancelOrder(orderId, buyerId);
      setOrders((prev) => prev.map((o) => o.orderId === orderId ? { ...o, orderStatus: "CANCELLED", cancelledAt: result.cancelledAt } : o));
      showToast("주문이 취소되었습니다.");
    } catch (error) {
      showToast(error.message || "주문 취소에 실패했습니다.");
    }
  }

  async function handleSaveProfile({ shopInfo, profileFile }) {
    try {
      let profileImageUrl = null;
      if (profileFile) {
        const result = await uploadMyProfileImage(profileFile);
        profileImageUrl = typeof result === "string" ? result : result?.data ?? result;
      }
      await updateMyProfile({ shopInfo, ...(profileImageUrl && { profileImageUrl }) });
      alert("프로필이 수정되었습니다.");
      window.location.reload();
    } catch (error) {
      showToast(error.message || "프로필 수정에 실패했습니다.");
      throw error;
    }
  }

  async function handleWithdraw() {
    if (!window.confirm("정말 회원 탈퇴하시겠습니까?\n탈퇴 후 계정 복구가 어려울 수 있습니다.")) return;
    if (!window.confirm("회원 탈퇴를 진행하면 현재 계정으로 다시 로그인할 수 없습니다.\n정말 탈퇴하시겠습니까?")) return;
    try {
      await withdrawMe();
      sessionStorage.removeItem("nailed_session");
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("nailed_session");
      localStorage.removeItem("accessToken");
      alert("회원 탈퇴가 완료되었습니다.");
      window.location.href = "/";
    } catch (error) {
      // M015: 진행중 거래(주문접수/결제완료/배송중)가 있어 탈퇴 차단된 경우
      if (error.code === "M015") {
        showToast("진행중인 거래가 있어 탈퇴할 수 없습니다. 거래 완료 후 다시 시도해 주세요.");
      } else {
        showToast(error.message || "회원 탈퇴에 실패했습니다.");
      }
    }
  }

  useEffect(() => {
    if (!memberId) return;
    if (hideFooter && currentTab !== "reviews") return;
    let ignore = false;

    async function loadReviews() {
      try {
        setRvLoading(true);
        const data = await getSellerReviews(memberId, page, 10);
        if (!ignore) {
          const reviewPage = data?.reviews ?? data?.data?.reviews ?? {};
          const nextReviews = toList(reviewPage);
          setAvgRating(data?.averageRating ?? data?.data?.averageRating ?? null);
          setReviews((prev) => page === 0 ? nextReviews : [...prev, ...nextReviews]);
          setTotalElements(readTotalElements(reviewPage));
          setTotalPages(readTotalPages(reviewPage));
        }
      } catch (error) {
        if (!ignore) { showToast(error.message || "리뷰를 불러올 수 없습니다."); setReviews([]); setTotalElements(0); setTotalPages(0); setAvgRating(null); }
      } finally {
        if (!ignore) setRvLoading(false);
      }
    }

    loadReviews();
    return () => { ignore = true; };
  }, [memberId, page, hideFooter, currentTab]);

  if (!seller) return (
    <>
      <Header />
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: "2.5px solid #e7e7e7", borderTopColor: "#151515", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
      <Footer />
    </>
  );

  const gradeClass = seller.sellerGrade.toLowerCase();
  const isDefaultImage = !seller.profileImageUrl || seller.profileImageUrl === toAssetUrl(SERVER_DEFAULT_PROFILE);

  return (
    <div className="up-page">
      <Header />

      {/* 프로필 헤더 */}
      <div className="up-profile-section">
        <div className="up-profile-inner">
          <div className="up-avatar-wrap">
            <div className="up-avatar">
              {seller.profileImageUrl ? (
                <img src={seller.profileImageUrl} alt={`${seller.nickname} 프로필`}
                  onError={() => setSeller((prev) => prev ? { ...prev, profileImageUrl: "" } : prev)} />
              ) : seller.nickname.charAt(0)}
            </div>
          </div>
          <div className="up-profile-info">
            <div className="up-name-row">
              <h1 className="up-nickname">{seller.nickname}</h1>
              <span className={`up-grade ${gradeClass}`}>{GRADE[seller.sellerGrade]}</span>
              {hideFooter && (
                <button type="button" className="up-profile-edit-btn" onClick={() => setProfileEditOpen(true)}>프로필 수정</button>
              )}
            </div>
            {seller.shopInfo && <p className="up-shop-info">{seller.shopInfo}</p>}
            <div className="up-stats"></div>
          </div>
          {hideFooter && (
            <div className="up-profile-actions">
              <button type="button" className="up-profile-edit-btn" onClick={() => { if (onNavigate) onNavigate("/mypage/account"); }}>
                정산 계좌
              </button>
              <div style={{ position: "relative" }}>
                <button type="button"
                  style={{ background: "none", border: "1px solid #3e7261", borderRadius: "6px", padding: "2px 10px", cursor: "pointer", fontSize: "13px", color: "#555" }}
                  onClick={(e) => { e.stopPropagation(); const menu = e.currentTarget.nextSibling; menu.style.display = menu.style.display === "block" ? "none" : "block"; }}>
                  •••
                </button>
                <div style={{ display: "none", position: "absolute", right: 0, top: "110%", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: "70px", padding: "6px 0" }}>
                  <button type="button"
                    style={{ display: "block", width: "100%", padding: "1px 0px", background: "none", border: "none", textAlign: "center", fontSize: "13px", color: "#e05c5c", cursor: "pointer", fontWeight: 600 }}
                    onClick={() => { if (onNavigate) onNavigate("/mypage/withdraw"); }}>
                    회원 탈퇴
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 탭 바 */}
      <div className="up-tabs-bar">
        <div className="up-tabs-inner">
          {profileTabs.map(({ key, label }) => (
            <button key={key} className={`up-tab ${currentTab === key ? "active" : ""}`}
              onClick={() => {
                if (hideFooter && onNavigate) { onNavigate(getPathFromTab(key)); return; }
                setActiveTab(key);
              }}>
              {key === "reviews" && totalElements > 0 ? `${label} ${totalElements}` : label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="up-inner">
        {tabLoading && currentTab !== "reviews" && <p className="up-empty">불러오는 중...</p>}

        {!tabLoading && currentTab === "products" && (
          <ProductsTab products={hideFooter ? myProducts : sellerProducts} emptyMessage="상품 정보가 없습니다." />
        )}

        {!tabLoading && hideFooter && currentTab === "orders" && (
          <OrdersTab
            orders={orders}
            onCancelOrder={handleCancelOrder}
            onWriteReview={(order) => setReviewModalOrder(order)}
          />
        )}
        {!tabLoading && hideFooter && currentTab === "selling"     && <SellingTab />}
        {!tabLoading && hideFooter && currentTab === "wishlist"    && <ProductsTab products={wishlist} emptyMessage="찜 목록 정보가 없습니다." />}
        {!tabLoading && hideFooter && currentTab === "settlements" && <SettlementTab settlements={settlements} />}
        {!tabLoading && hideFooter && currentTab === "inquiries"   && (
          <InquiriesTab inquiries={inquiries} selectedInquiry={selectedInquiry} detailLoading={detailLoading} onSelectInquiry={handleSelectInquiry} />
        )}
        {!tabLoading && hideFooter && currentTab === "reports"     && <ReportsTab reports={reports} />}
        {!tabLoading && hideFooter && currentTab === "account"     && <AccountTab />}
        {!tabLoading && hideFooter && currentTab === "withdraw"    && <WithdrawTab onWithdraw={handleWithdraw} />}

        {currentTab === "reviews" && (
          <ReviewsTab
            reviews={reviews}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            rvLoading={rvLoading}
            totalElements={totalElements}
          />
        )}

        {!hideFooter && currentTab !== "products" && currentTab !== "reviews" && currentTab !== "settlements" && (
          <EmptyProfileTab label={profileTabs.find((tab) => tab.key === currentTab)?.label ?? "선택한 탭"} />
        )}
      </div>

      {!hideFooter && <Footer />}

      {profileEditOpen && (
        <ProfileSettingsModal seller={seller} onClose={() => setProfileEditOpen(false)} onSave={handleSaveProfile} onDeleteImage={handleDeleteProfileImage} />
      )}

      {reviewModalOrder && (
        <ReviewWriteModal
          order={reviewModalOrder}
          onClose={() => setReviewModalOrder(null)}
          onSaved={() => {
            const savedOrderId = reviewModalOrder.orderId;
            setOrders((prev) =>
              prev.map((o) =>
                o.orderId === savedOrderId ? { ...o, hasReview: true } : o
              )
            );
            setReviewModalOrder(null);
          }}
        />
      )}

      {toast && <div className="pd-toast">{toast}</div>}
    </div>
  );
}

export default UserProfilePage;
