import { useEffect, useMemo, useRef, useState } from "react";
import { cancelAdminOrder, getAdminOrders } from "../../api/adminApi";
import { API_BASE_URL } from "../../api/config";

const ORDER_STATUS_LABELS = {
  REQUESTED: "주문접수",
  PAID: "결제완료",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
};

const ORDER_STATUS_CLASS_NAMES = {
  REQUESTED: "orange",
  PAID: "mint",
  SHIPPING: "blue",
  DELIVERED: "gray",
  CANCELLED: "red",
};

const PAGE_SIZE = 10;
const DEFAULT_ORDER_SORT = "";
const ADMIN_CANCEL_ALLOWED_STATUSES = ["PAID", "REQUESTED", "SHIPPING"];

function toAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

const CARRIERS = [
  { value: "CJ",         label: "CJ대한통운" },
  { value: "LOGEN",      label: "로젠택배" },
  { value: "HANJIN",     label: "한진택배" },
  { value: "KOREA_POST", label: "우체국택배" },
  { value: "LOTTE",      label: "롯데택배" },
];

function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price)) return "-";
  return `${price.toLocaleString("ko-KR")}원`;
}

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 0) return [];

  const start = Math.max(0, currentPage - 2);
  const end = Math.min(totalPages - 1, start + 4);
  const adjustedStart = Math.max(0, end - 4);

  return Array.from(
    { length: end - adjustedStart + 1 },
    (_, index) => adjustedStart + index,
  );
}

function OrderThumbnail({ order }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = toAssetUrl(order.productThumbnailUrl);

  if (!imageUrl || hasError) {
    return (
      <span
        aria-label="상품 이미지 없음"
        style={{
          width: 42,
          height: 42,
          display: "inline-grid",
          placeItems: "center",
          borderRadius: 6,
          background: "#f0f1f2",
          color: "#888",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        없음
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={order.productTitle || "상품 이미지"}
      loading="lazy"
      onError={() => setHasError(true)}
      style={{
        width: 42,
        height: 42,
        display: "block",
        borderRadius: 6,
        objectFit: "cover",
        background: "#f0f1f2",
      }}
    />
  );
}

function DetailItem({ label, value }) {
  const displayValue = value ?? "-";

  return (
    <div className="admin-detail-item">
      <dt>{label}</dt>
      <dd>{displayValue === "" ? "-" : displayValue}</dd>
    </div>
  );
}

function AdminOrdersPage() {
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [sort, setSort] = useState(DEFAULT_ORDER_SORT);
  const [appliedSort, setAppliedSort] = useState(DEFAULT_ORDER_SORT);
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    pageNumber: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openActionOrderId, setOpenActionOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedShippingOrder, setSelectedShippingOrder] = useState(null);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const successTimerRef = useRef(null);

  function showSuccessMessage(msg) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessMessage(msg);
    successTimerRef.current = setTimeout(() => setSuccessMessage(""), 1000);
  }
  const [reloadKey, setReloadKey] = useState(0);

  const pageNumbers = useMemo(
    () => getPageNumbers(pageInfo.pageNumber, pageInfo.totalPages),
    [pageInfo.pageNumber, pageInfo.totalPages],
  );

  useEffect(() => {
    let ignore = false;

    async function loadOrders() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getAdminOrders({
          page,
          size: PAGE_SIZE,
          keyword: appliedKeyword,
          orderStatus,
          sort: appliedSort,
        });

        if (ignore) return;

        const content = Array.isArray(data?.content) ? data.content : [];
        setOrders(content);
        setSelectedOrder((current) => {
          if (!current?.orderId) return current;
          const refreshedOrder = content.find((order) => order.orderId === current.orderId);
          return refreshedOrder ? { ...current, ...refreshedOrder } : current;
        });
        setPageInfo({
          pageNumber: data?.pageNumber ?? page,
          pageSize: data?.pageSize ?? PAGE_SIZE,
          totalElements: data?.totalElements ?? 0,
          totalPages: data?.totalPages ?? 0,
          first: data?.first ?? true,
          last: data?.last ?? true,
        });
      } catch (error) {
        if (ignore) return;

        setOrders([]);
        setPageInfo((current) => ({
          ...current,
          pageNumber: 0,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        }));
        setErrorMessage(error.message || "주문 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      ignore = true;
    };
  }, [appliedKeyword, appliedSort, orderStatus, page, reloadKey]);

  useEffect(() => {
    function closeActionMenu() {
      setOpenActionOrderId(null);
    }

    document.addEventListener("click", closeActionMenu);
    return () => document.removeEventListener("click", closeActionMenu);
  }, []);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setPage(0);
    setAppliedKeyword(keyword.trim());
    setAppliedSort(sort);
  }

  function handleStatusChange(event) {
    setOrderStatus(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    const nextSort = event.target.value;
    setSort(nextSort);
    setAppliedSort(nextSort);
    setPage(0);
  }

  function handleActionMenuClick(action, order) {
    setOpenActionOrderId(null);
    if (action === "상세보기") {
      setSelectedOrder(order);
      return;
    }

    if (action === "배송정보") {
      setSelectedShippingOrder(order);
      return;
    }

    if (action === "관리자 권한 주문 강제 취소") {
      if (!ADMIN_CANCEL_ALLOWED_STATUSES.includes(order?.orderStatus)) {
        setErrorMessage("배송완료 또는 취소 주문은 관리자 권한으로 강제 취소할 수 없습니다.");
        return;
      }

      setSelectedCancelOrder(order);
      setCancelReason("");
      setCancelMessage("");
      return;
    }

    console.log("[admin orders action]", action, order?.orderId);
  }

  function updateCancelledOrder(updatedOrder, fallbackOrderId) {
    const targetOrderId = updatedOrder?.orderId ?? fallbackOrderId;
    if (!targetOrderId) return;

    const patch = { ...(updatedOrder ?? {}), orderStatus: "CANCELLED" };

    setOrders((current) => (
      current.map((order) => (
        order.orderId === targetOrderId
          ? { ...order, ...patch }
          : order
      ))
    ));

    setSelectedOrder((current) => (
      current?.orderId === targetOrderId
        ? { ...current, ...patch }
        : current
    ));
  }

  function closeCancelModal() {
    if (cancelSubmitting) return;
    setSelectedCancelOrder(null);
    setCancelReason("");
    setCancelMessage("");
  }

  async function handleCancelSubmit(event) {
    event.preventDefault();

    const reason = cancelReason.trim();
    if (!reason) {
      setCancelMessage("주문 강제 취소 사유를 입력해주세요.");
      return;
    }

    if (reason.length > 500) {
      setCancelMessage("주문 강제 취소 사유는 500자 이내로 입력해주세요.");
      return;
    }

    if (!selectedCancelOrder?.orderId) {
      setCancelMessage("주문 정보를 확인할 수 없습니다.");
      return;
    }

    if (!ADMIN_CANCEL_ALLOWED_STATUSES.includes(selectedCancelOrder.orderStatus)) {
      setCancelMessage("배송완료 또는 취소 주문은 관리자 권한으로 강제 취소할 수 없습니다.");
      return;
    }

    setCancelSubmitting(true);
    setCancelMessage("");

    try {
      const updatedOrder = await cancelAdminOrder(selectedCancelOrder.orderId, reason);
      updateCancelledOrder(updatedOrder, selectedCancelOrder.orderId);
      setSelectedCancelOrder(null);
      setCancelReason("");
      setReloadKey((current) => current + 1);
    } catch (error) {
    } finally {
      setCancelSubmitting(false);
    }
  }

  return (
    <div className="admin-page admin-orders-page">
      <div className="admin-content-main">
        <section className="admin-card search-filter-card">
          <form className="filter-row admin-filter-row-date" onSubmit={handleSearchSubmit}>
            <div className="filter-field search-field">
              <label htmlFor="admin-order-search">주문 검색</label>
              <div className="filter-input">
                <input
                  id="admin-order-search"
                  type="search"
                  placeholder="주문번호, 상품명, 구매자, 판매자 검색"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-order-status">주문 상태</label>
              <select id="admin-order-status" value={orderStatus} onChange={handleStatusChange}>
                <option value="">전체</option>
                <option value="PAID">결제완료</option>
                <option value="REQUESTED">주문접수</option>
                <option value="SHIPPING">배송중</option>
                <option value="DELIVERED">배송완료</option>
                <option value="CANCELLED">취소</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-order-sort">주문등록일</label>
              <select id="admin-order-sort" value={sort} onChange={handleSortChange}>
                <option value="">전체</option>
                <option value="updatedAt,desc">최신순</option>
                <option value="updatedAt,asc">오래된순</option>
              </select>
            </div>

            <button className="admin-primary-button" type="submit">
              검색
            </button>
          </form>
        </section>

        <section className="admin-card table-card">
          <div className="table-card-header">
            <h2>
              주문 목록 <span>(총 {pageInfo.totalElements}건)</span>
            </h2>
          </div>

          {errorMessage && <p className="admin-inquiry-message">{errorMessage}</p>}
          {successMessage && <p className="admin-inquiry-message is-success">{successMessage}</p>}

          <div className="admin-table-wrap">
            <table className="admin-table admin-order-table">
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>이미지</th>
                  <th>상품명</th>
                  <th>구매자</th>
                  <th>판매자</th>
                  <th>주문상태</th>
                  <th>상품금액</th>
                  <th>최종결제금액</th>
                  <th>결제일</th>
                  <th>완료일</th>
                  <th>수정일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" className="admin-inquiry-empty">
                      주문 목록을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="admin-inquiry-empty">
                      주문 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={String(order.orderId)}>
                      <td>{String(order.orderId || "-")}</td>
                      <td>
                        <OrderThumbnail order={order} />
                      </td>
                      <td title={order.productTitle || ""}>
                        {order.productTitle || "-"}
                        {order.productId != null && (
                          <span style={{ display: "block", marginTop: 2, color: "#888", fontSize: 11 }}>
                            상품ID {String(order.productId)}
                          </span>
                        )}
                      </td>
                      <td title={order.buyerId || ""}>{order.buyerNickname || order.buyerUserid || "-"}</td>
                      <td title={order.sellerId || ""}>{order.sellerNickname || order.sellerUserid || "-"}</td>
                      <td>
                        <span className={`status-badge ${ORDER_STATUS_CLASS_NAMES[order.orderStatus] || "gray"}`}>
                          {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus || "-"}
                        </span>
                      </td>
                      <td>{formatPrice(order.product.price)}</td>
                      <td>{formatPrice(order.finalPrice)}</td>
                      <td>{formatDate(order.paidAt)}</td>
                      <td>{formatDate(order.completedAt)}</td>
                      <td>{formatDate(order.updatedAt)}</td>
                      <td className="row-action-cell" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="row-action-button"
                          type="button"
                          aria-expanded={openActionOrderId === order.orderId}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionOrderId((current) => (current === order.orderId ? null : order.orderId));
                          }}
                        >
                          관리
                        </button>
                        {openActionOrderId === order.orderId && (
                          <div className="row-action-menu row-action-menu-wide">
                            {[
                              { label: "상세보기" },
                              { label: "배송정보" },
                              {
                                label: "관리자 권한 주문 강제 취소",
                                disabled: !ADMIN_CANCEL_ALLOWED_STATUSES.includes(order.orderStatus),
                              },
                            ].map((action) => (
                              <button
                                type="button"
                                key={action.label}
                                disabled={action.disabled}
                                title={action.disabled ? "배송완료 또는 취소 주문은 강제 취소할 수 없습니다." : undefined}
                                onClick={() => handleActionMenuClick(action.label, order)}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-pagination">
            <button
              type="button"
              disabled={pageInfo.first || loading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              이전
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                className={pageInfo.pageNumber === pageNumber ? "is-active" : ""}
                type="button"
                key={pageNumber}
                disabled={loading}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={pageInfo.last || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              다음
            </button>
          </div>
        </section>
      </div>

      {selectedOrder && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={() => setSelectedOrder(null)}>
          <section
            className="admin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-order-detail-title">주문 상세</h2>
              <button type="button" aria-label="주문 상세 닫기" onClick={() => setSelectedOrder(null)}>
                ×
              </button>
            </div>
            <div className="admin-detail-media-row">
              <OrderThumbnail order={selectedOrder} />
              <div>
                <strong>{selectedOrder.productTitle || "-"}</strong>
                <span>주문번호 {selectedOrder.orderId || "-"}</span>
              </div>
            </div>
            <dl className="admin-detail-grid">
              <DetailItem label="주문번호" value={selectedOrder.orderId} />
              <DetailItem label="상품명" value={selectedOrder.productTitle} />
              <DetailItem label="상품 ID" value={selectedOrder.productId} />
              <DetailItem label="구매자" value={selectedOrder.buyerNickname || selectedOrder.buyerUserid} />
              <DetailItem label="판매자" value={selectedOrder.sellerNickname || selectedOrder.sellerUserid} />
              <DetailItem
                label="주문상태"
                value={ORDER_STATUS_LABELS[selectedOrder.orderStatus] || selectedOrder.orderStatus}
              />
              <DetailItem label="상품금액" value={formatPrice(selectedOrder.product?.price)} />
              <DetailItem label="최종결제금액" value={formatPrice(selectedOrder.finalPrice)} />
              <DetailItem label="결제일" value={formatDate(selectedOrder.paidAt)} />
              <DetailItem label="주문접수일" value={formatDate(selectedOrder.requestedAt)} />
              <DetailItem label="배송일" value={formatDate(selectedOrder.shippedAt)} />
              {selectedOrder.orderStatus === "DELIVERED" && (
                <DetailItem label="완료일" value={formatDate(selectedOrder.completedAt)} />
              )}
              <DetailItem label="수정일" value={formatDate(selectedOrder.updatedAt)} />
              {selectedOrder.orderStatus === "CANCELLED" && (
                <>
                  <DetailItem label="취소일" value={formatDate(selectedOrder.cancelledAt)} />
                  <DetailItem label="취소사유" value={selectedOrder.cancelReason || selectedOrder.cancelRequestReason} />
                </>
              )}
            </dl>
          </section>
        </div>
      )}

      {selectedShippingOrder && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={() => setSelectedShippingOrder(null)}>
          <section
            className="admin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-shipping-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-shipping-title">배송 정보</h2>
              <button type="button" aria-label="배송 정보 닫기" onClick={() => setSelectedShippingOrder(null)}>
                ×
              </button>
            </div>
            <div className="admin-detail-media-row">
              <OrderThumbnail order={selectedShippingOrder} />
              <div>
                <strong>{selectedShippingOrder.productTitle || "-"}</strong>
                <span>주문번호 {selectedShippingOrder.orderId || "-"}</span>
              </div>
            </div>
            <dl className="admin-detail-grid">
              <DetailItem
                label="주문 상태"
                value={ORDER_STATUS_LABELS[selectedShippingOrder.orderStatus] || selectedShippingOrder.orderStatus}
              />
              {["REQUESTED", "SHIPPING", "DELIVERED"].includes(selectedShippingOrder.orderStatus) ? (
                <>
                  <DetailItem label="접수 시각" value={formatDateTime(selectedShippingOrder.requestedAt)} />
                  {selectedShippingOrder.carrierCode && (
                    <DetailItem
                      label="택배사"
                      value={CARRIERS.find((c) => c.value === selectedShippingOrder.carrierCode)?.label || selectedShippingOrder.carrierCode}
                    />
                  )}
                  {selectedShippingOrder.trackingNumber && (
                    <DetailItem label="운송장 번호" value={selectedShippingOrder.trackingNumber} />
                  )}
                  {selectedShippingOrder.shippedAt && (
                    <DetailItem label="배송 출발 시각" value={formatDateTime(selectedShippingOrder.shippedAt)} />
                  )}
                  {selectedShippingOrder.orderStatus === "DELIVERED" && selectedShippingOrder.completedAt && (
                    <DetailItem label="배송완료 시각" value={formatDateTime(selectedShippingOrder.completedAt)} />
                  )}
                </>
              ) : (
                <div className="admin-detail-item" style={{ gridColumn: "1 / -1" }}>
                  <dd style={{ color: "#888" }}>등록된 배송 정보가 없습니다.</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      )}

      {selectedCancelOrder && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={closeCancelModal}>
          <section
            className="admin-detail-modal admin-order-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-cancel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-order-cancel-title">관리자 권한 주문 강제 취소</h2>
              <button type="button" aria-label="주문 강제 취소 닫기" onClick={closeCancelModal}>
                ×
              </button>
            </div>
            <form className="admin-detail-form" onSubmit={handleCancelSubmit}>
              <dl className="admin-detail-grid admin-detail-grid-compact">
                <DetailItem label="주문번호" value={selectedCancelOrder.orderId} />
                <DetailItem label="상품명" value={selectedCancelOrder.productTitle || selectedCancelOrder.title} />
                <DetailItem label="구매자" value={selectedCancelOrder.buyerNickname || selectedCancelOrder.buyerUserid || selectedCancelOrder.buyerName} />
                <DetailItem label="판매자" value={selectedCancelOrder.sellerNickname || selectedCancelOrder.sellerUserid || selectedCancelOrder.sellerName} />
                <DetailItem
                  label="현재 주문상태"
                  value={ORDER_STATUS_LABELS[selectedCancelOrder.orderStatus] || selectedCancelOrder.orderStatus}
                />
                <DetailItem label="최종결제금액" value={formatPrice(selectedCancelOrder.finalPrice)} />
              </dl>

              <div className="admin-report-process-note">
                관리자 권한으로 주문을 강제 취소합니다.<br />
                취소 후 주문 상태는 CANCELLED로 변경되며, 연결 상품은 판매중 상태로 복구됩니다.
              </div>

              {selectedCancelOrder.orderStatus === "SHIPPING" && (
                <div className="admin-order-cancel-shipping-note">
                  배송정보는 분쟁 기록 확인을 위해 유지됩니다.
                </div>
              )}

              <label className="admin-detail-field" htmlFor="admin-order-cancel-reason">
                <span>취소 사유</span>
                <textarea
                  id="admin-order-cancel-reason"
                  className="admin-detail-textarea"
                  value={cancelReason}
                  maxLength={500}
                  placeholder="관리자 권한 주문 강제 취소 사유를 입력하세요."
                  disabled={cancelSubmitting}
                  onChange={(event) => {
                    setCancelReason(event.target.value);
                    setCancelMessage("");
                  }}
                />
              </label>
              <div className="admin-detail-helper">{cancelReason.length}/500</div>
              {cancelMessage && <p className="admin-detail-error">{cancelMessage}</p>}

              <div className="admin-detail-modal-actions">
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={cancelSubmitting}
                  onClick={closeCancelModal}
                >
                  취소
                </button>
                <button className="admin-detail-danger-button" type="submit" disabled={cancelSubmitting}>
                  {cancelSubmitting ? "처리 중" : "강제 취소"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersPage;
