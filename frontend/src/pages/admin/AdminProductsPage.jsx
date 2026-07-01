import { useEffect, useMemo, useState } from "react";
import { getAdminProducts, getAdminProduct, deleteAdminProduct, restoreAdminProduct } from "../../api/adminApi";
import { API_BASE_URL } from "../../api/config";

const PRODUCT_STATUS_LABELS = {
  ON_SALE: "판매중",
  SOLD: "판매완료",
  DELETED: "삭제됨",
};

const PRODUCT_STATUS_CLASS_NAMES = {
  ON_SALE: "mint",
  SOLD: "blue",
  DELETED: "gray",
};

const PAGE_SIZE = 10;
const DEFAULT_PRODUCT_SORT = "";

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

function ProductThumbnail({ product }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = toAssetUrl(product.thumbnailUrl);

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
      alt={product.title || "상품 이미지"}
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

function AdminProductsPage() {
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [sort, setSort] = useState(DEFAULT_PRODUCT_SORT);
  const [appliedSort, setAppliedSort] = useState(DEFAULT_PRODUCT_SORT);
  const [page, setPage] = useState(0);
  const [products, setProducts] = useState([]);
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
  const [openActionProductId, setOpenActionProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductForDelete, setSelectedProductForDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [selectedProductForRestore, setSelectedProductForRestore] = useState(null);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const pageNumbers = useMemo(
    () => getPageNumbers(pageInfo.pageNumber, pageInfo.totalPages),
    [pageInfo.pageNumber, pageInfo.totalPages],
  );

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getAdminProducts({
          page,
          size: PAGE_SIZE,
          keyword: appliedKeyword,
          productStatus,
          sort: appliedSort,
        });

        if (ignore) return;

        const content = Array.isArray(data?.content) ? data.content : [];
        setProducts(content);
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

        setProducts([]);
        setPageInfo((current) => ({
          ...current,
          pageNumber: 0,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        }));
        setErrorMessage(error.message || "상품 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [appliedKeyword, appliedSort, page, productStatus, reloadKey]);

  useEffect(() => {
    function closeActionMenu() {
      setOpenActionProductId(null);
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
    setProductStatus(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    const nextSort = event.target.value;
    setSort(nextSort);
    setAppliedSort(nextSort);
    setPage(0);
  }

  async function handleActionMenuClick(action, product) {
    setOpenActionProductId(null);
    if (action === "상세보기") {
      try {
        const detail = await getAdminProduct(product.productId);
        setSelectedProduct(detail);
      } catch {
        setSelectedProduct(product);
      }
      return;
    }

    if (action === "상품삭제") {
      setSelectedProductForDelete(product);
      setDeleteReason("");
      setDeleteMessage("");
      return;
    }

    if (action === "복구") {
      setSelectedProductForRestore(product);
      return;
    }

    console.log("[admin products action]", action, product?.productId);
  }

  function handleDeleteModalClose() {
    if (deleteSubmitting) return;
    setSelectedProductForDelete(null);
    setDeleteReason("");
    setDeleteMessage("");
  }

  async function handleDeleteSubmit(event) {
    event.preventDefault();

    const reason = deleteReason.trim();
    if (!reason) {
      setDeleteMessage("삭제 사유를 입력해주세요.");
      return;
    }

    if (reason.length > 500) {
      setDeleteMessage("삭제 사유는 500자 이내로 입력해주세요.");
      return;
    }

    if (!selectedProductForDelete?.productId) {
      setDeleteMessage("상품 정보를 확인할 수 없습니다.");
      return;
    }

    setDeleteSubmitting(true);
    setDeleteMessage("");

    try {
      await deleteAdminProduct(selectedProductForDelete.productId, reason);
      setSelectedProductForDelete(null);
      setDeleteReason("");
      setReloadKey((current) => current + 1);
    } catch (error) {
      setDeleteMessage(error.message || "상품 삭제에 실패했습니다.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleRestoreConfirm() {
    if (!selectedProductForRestore?.productId) return;
    setRestoreSubmitting(true);

    try {
      await restoreAdminProduct(selectedProductForRestore.productId);
      setSelectedProductForRestore(null);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(error.message || "상품 복구에 실패했습니다.");
      setSelectedProductForRestore(null);
    } finally {
      setRestoreSubmitting(false);
    }
  }

  return (
    <div className="admin-page admin-products-page">
      <div className="admin-content-main">
        <section className="admin-card search-filter-card">
          <form className="filter-row admin-filter-row-compact" onSubmit={handleSearchSubmit}>
            <div className="filter-field search-field">
              <label htmlFor="admin-product-search">상품 검색</label>
              <div className="filter-input">
                <input
                  id="admin-product-search"
                  type="search"
                  placeholder="상품명, 브랜드, 판매자 검색"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-product-status">판매 상태</label>
              <select id="admin-product-status" value={productStatus} onChange={handleStatusChange}>
                <option value="">전체</option>
                <option value="ON_SALE">판매중</option>
                <option value="SOLD">판매완료</option>
                <option value="DELETED">삭제됨</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-product-sort">상품등록일</label>
              <select id="admin-product-sort" value={sort} onChange={handleSortChange}>
                <option value="">전체</option>
                <option value="createdAt,desc">최신순</option>
                <option value="createdAt,asc">오래된순</option>
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
              상품 목록 <span>(총 {pageInfo.totalElements}건)</span>
            </h2>
          </div>

          {errorMessage && <p className="admin-inquiry-message">{errorMessage}</p>}

          <div className="admin-table-wrap">
            <table className="admin-table admin-product-table">
              <thead>
                <tr>
                  <th>이미지</th>
                  <th>상품ID</th>
                  <th>상품명</th>
                  <th>브랜드</th>
                  <th>카테고리</th>
                  <th>가격</th>
                  <th>상태</th>
                  <th>조회</th>
                  <th>찜</th>
                  <th>판매자</th>
                  <th>등록일</th>
                  <th>수정일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="13" className="admin-inquiry-empty">
                      상품 목록을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="admin-inquiry-empty">
                      상품 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={String(product.productId)}>
                      <td>
                        <ProductThumbnail product={product} />
                      </td>
                      <td>{product.productId ?? "-"}</td>
                      <td title={product.title || ""}>{product.title || "-"}</td>
                      <td>{product.brandName || "-"}</td>
                      <td>{product.categoryPath || product.categoryName || "-"}</td>
                      <td>{formatPrice(product.price)}</td>
                      <td>
                        <span className={`status-badge ${PRODUCT_STATUS_CLASS_NAMES[product.productStatus] || "gray"}`}>
                          {PRODUCT_STATUS_LABELS[product.productStatus] || product.productStatus || "-"}
                        </span>
                      </td>
                      <td>{product.viewCount ?? 0}</td>
                      <td>{product.wishlistCount ?? 0}</td>
                      <td>{product.sellerNickname || product.sellerUserid || "-"}</td>
                      <td>{formatDate(product.createdAt)}</td>
                      <td>{formatDate(product.updatedAt)}</td>
                      <td className="row-action-cell" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="row-action-button"
                          type="button"
                          aria-expanded={openActionProductId === product.productId}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionProductId((current) => (
                              current === product.productId ? null : product.productId
                            ));
                          }}
                        >
                          관리
                        </button>
                        {openActionProductId === product.productId && (
                          <div className="row-action-menu">
                            {[
                              { label: "상세보기" },
                              ...(product.productStatus === "DELETED"
                                ? (product.deletedReason ? [{ label: "복구" }] : [])
                                : [{ label: "상품삭제" }]),
                            ].map((action) => (
                              <button
                                type="button"
                                key={action.label}
                                onClick={() => handleActionMenuClick(action.label, product)}
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

      {selectedProduct && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={() => setSelectedProduct(null)}>
          <section
            className="admin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-product-detail-title">상품 상세</h2>
              <button type="button" aria-label="상품 상세 닫기" onClick={() => setSelectedProduct(null)}>
                ×
              </button>
            </div>
            <div className="admin-detail-media-row">
              <ProductThumbnail product={selectedProduct} />
              <div>
                <strong>{selectedProduct.title || "-"}</strong>
                <span>상품 ID {selectedProduct.productId ?? "-"}</span>
              </div>
            </div>
            <dl className="admin-detail-grid">
              <DetailItem label="상품 ID" value={selectedProduct.productId} />
              <DetailItem label="상품명" value={selectedProduct.title} />
              <DetailItem label="브랜드" value={selectedProduct.brandName} />
              <DetailItem label="카테고리" value={selectedProduct.categoryPath || selectedProduct.categoryName} />
              <DetailItem label="가격" value={formatPrice(selectedProduct.price)} />
              <DetailItem
                label="상품 상태"
                value={PRODUCT_STATUS_LABELS[selectedProduct.productStatus] || selectedProduct.productStatus}
              />
              <DetailItem label="조회수" value={selectedProduct.viewCount ?? 0} />
              <DetailItem label="찜 수" value={selectedProduct.wishlistCount ?? 0} />
              <DetailItem label="판매자" value={selectedProduct.sellerNickname || selectedProduct.sellerUserid} />
              <DetailItem label="등록일" value={formatDate(selectedProduct.createdAt)} />
              <DetailItem label="수정일" value={formatDate(selectedProduct.updatedAt)} />
              <DetailItem label="삭제 사유" value={selectedProduct.deletedReason} />
              <DetailItem label="삭제일" value={formatDate(selectedProduct.deletedAt)} />
            </dl>
          </section>
        </div>
      )}

      {selectedProductForDelete && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={handleDeleteModalClose}>
          <section
            className="admin-detail-modal admin-hide-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-product-delete-title">상품 삭제</h2>
              <button type="button" aria-label="상품 삭제 닫기" onClick={handleDeleteModalClose}>
                ×
              </button>
            </div>
            <form className="admin-detail-form" onSubmit={handleDeleteSubmit}>
              <div className="admin-detail-media-row">
                <ProductThumbnail product={selectedProductForDelete} />
                <div>
                  <strong>{selectedProductForDelete.title || "-"}</strong>
                  <span>상품 ID {selectedProductForDelete.productId ?? "-"}</span>
                </div>
              </div>

              <label className="admin-detail-field" htmlFor="admin-product-delete-reason">
                <span>삭제 사유</span>
                <textarea
                  id="admin-product-delete-reason"
                  className="admin-detail-textarea"
                  value={deleteReason}
                  maxLength={500}
                  placeholder="관리자 상품 삭제 사유를 입력하세요."
                  disabled={deleteSubmitting}
                  onChange={(event) => {
                    setDeleteReason(event.target.value);
                    setDeleteMessage("");
                  }}
                />
              </label>
              <div className="admin-detail-helper">{deleteReason.length}/500</div>
              {deleteMessage && <p className="admin-detail-error">{deleteMessage}</p>}

              <div className="admin-detail-modal-actions">
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleDeleteModalClose}
                >
                  취소
                </button>
                <button className="admin-detail-danger-button" type="submit" disabled={deleteSubmitting}>
                  {deleteSubmitting ? "처리 중" : "삭제"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedProductForRestore && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={() => !restoreSubmitting && setSelectedProductForRestore(null)}>
          <section
            className="admin-detail-modal admin-hide-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-restore-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-product-restore-title">상품 복구</h2>
              <button type="button" aria-label="상품 복구 닫기" onClick={() => !restoreSubmitting && setSelectedProductForRestore(null)}>
                ×
              </button>
            </div>
            <div className="admin-detail-form">
              <div className="admin-detail-media-row">
                <ProductThumbnail product={selectedProductForRestore} />
                <div>
                  <strong>{selectedProductForRestore.title || "-"}</strong>
                  <span>상품 ID {selectedProductForRestore.productId ?? "-"}</span>
                </div>
              </div>
              <p style={{ margin: "12px 0", fontSize: 14, color: "var(--admin-muted)" }}>
                이 상품을 판매중 상태로 복구합니다. 계속하시겠습니까?
              </p>
              <div className="admin-detail-modal-actions">
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={restoreSubmitting}
                  onClick={() => setSelectedProductForRestore(null)}
                >
                  취소
                </button>
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={restoreSubmitting}
                  onClick={handleRestoreConfirm}
                >
                  {restoreSubmitting ? "처리 중" : "복구"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminProductsPage;
