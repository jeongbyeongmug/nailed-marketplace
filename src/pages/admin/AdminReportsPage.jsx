import { useEffect, useMemo, useState } from "react";
import {
  getAdminOrders,
  getAdminProducts,
  getAdminReports,
  penalizeAdminReport,
  rejectAdminReport,
} from "../../api/adminApi";

const TARGET_TYPE_LABELS = {
  MEMBER: "회원",
};

const REASON_LABELS = {
  FRAUD: "사기 의심",
  MISLEADING_INFO: "상품 정보 허위/불일치",
  PROHIBITED_ITEM: "금지 품목",
  ETC: "기타",
};

const REPORT_STATUS_LABELS = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
  DONE: "완료",
};

const REPORT_STATUS_CLASS_NAMES = {
  PENDING: "orange",
  APPROVED: "mint",
  REJECTED: "red",
  DONE: "blue",
};

const ORDER_STATUS_LABELS = {
  PAID: "결제완료",
  REQUESTED: "주문접수",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
};

const MEMBER_STATUS_LABELS = {
  ACTIVE: "활동중",
  LOCKED: "잠금",
  WITHDRAWN: "탈퇴",
  SUSPEND: "정지",
  BANNED: "영구정지",
};

const SELLER_GRADE_LABELS = {
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  DIAMOND: "다이아몬드",
};

const PENALTY_TYPE_LABELS = {
  WARNING: "경고",
  SUSPEND: "정지",
  BAN: "영구정지",
};

const PAGE_SIZE = 10;
const DETAIL_SUMMARY_FETCH_SIZE = 30;
const DETAIL_SUMMARY_PAGE_SIZE = 3;
const DETAIL_REPORT_HISTORY_SIZE = 100;
const REPORT_TARGET_TYPE = "MEMBER";
const DEFAULT_REPORT_SORT = "";
const REPORT_HISTORY_SORT = "reportId,asc";
const PRODUCT_SORT = "productId,asc";
const ORDER_SORT = "orderId,asc";

function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().slice(0, 10);
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

function sortByIdAsc(items, field) {
  return [...items].sort((a, b) => Number(a?.[field] ?? 0) - Number(b?.[field] ?? 0));
}

function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price)) return "-";
  return `${price.toLocaleString("ko-KR")}원`;
}

function getListContent(data) {
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function getTotalPages(data) {
  return Number(data?.totalPages ?? data?.data?.totalPages ?? 1) || 1;
}

async function fetchTargetReportHistory(targetKeyword) {
  const request = (pageNumber) =>
    getAdminReports({
      page: pageNumber,
      size: DETAIL_REPORT_HISTORY_SIZE,
      keyword: targetKeyword,
      targetType: REPORT_TARGET_TYPE,
      sort: REPORT_HISTORY_SORT,
    });

  const firstPageData = await request(0);
  const totalPages = getTotalPages(firstPageData);
  const firstPageContent = getListContent(firstPageData);

  if (totalPages <= 1) return firstPageContent;

  const otherPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => request(index + 1)),
  );

  return [
    ...firstPageContent,
    ...otherPages.flatMap((pageData) => getListContent(pageData)),
  ];
}

function getTargetKeyword(report) {
  return String(
    report?.targetUserid ||
      report?.targetUserId ||
      report?.targetName ||
      report?.targetMemberId ||
      report?.targetId ||
      "",
  ).trim();
}

function getFirstValue(source, fields) {
  for (const field of fields) {
    const value = source?.[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function getTargetMemberId(report) {
  return getFirstValue(report, ["targetMemberId", "target_member_id", "targetId", "target_id"]);
}

function getTargetMemberName(report) {
  return getFirstValue(report, ["targetUserid", "targetUserId", "target_userid", "targetName", "target_name"]);
}

function getTargetMemberStatus(report) {
  return getFirstValue(report, [
    "targetMemberStatus",
    "target_member_status",
    "memberStatus",
    "member_status",
    "targetStatus",
    "target_status",
  ]) || "";
}

function getTargetSellerGrade(report) {
  return getFirstValue(report, [
    "targetSellerGrade",
    "target_seller_grade",
    "sellerGrade",
    "seller_grade",
  ]);
}

function getReportDetailText(report) {
  return getFirstValue(report, ["detail", "description", "content"]);
}

function isSameReportTarget(report, targetReport) {
  const selectedId = String(getTargetMemberId(report) || "").trim();
  const selectedName = String(getTargetMemberName(report) || "").trim();
  const targetId = String(getTargetMemberId(targetReport) || "").trim();
  const targetName = String(getTargetMemberName(targetReport) || "").trim();

  if (selectedId && targetId && selectedId === targetId) return true;
  if (selectedName && targetName && selectedName === targetName) return true;

  return false;
}

function getReportHistorySummary(report, targetReports) {
  const matchedReports = targetReports.filter((targetReport) => isSameReportTarget(report, targetReport));
  const counts = matchedReports.reduce((acc, item) => {
    const reasonCode = item?.reasonCode || "ETC";
    acc[reasonCode] = (acc[reasonCode] || 0) + 1;
    return acc;
  }, {});

  return {
    total: matchedReports.length,
    counts,
    available: matchedReports.length > 0,
  };
}

function getPagedItems(items, page) {
  const start = page * DETAIL_SUMMARY_PAGE_SIZE;
  return items.slice(start, start + DETAIL_SUMMARY_PAGE_SIZE);
}

function SummaryPagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="report-summary-pagination">
      {Array.from({ length: totalPages }, (_, index) => (
        <button
          className={page === index ? "is-active" : ""}
          key={index}
          type="button"
          onClick={() => onChange(index)}
        >
          {index + 1}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
      >
        다음
      </button>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function ModalDetailItem({ label, value }) {
  return (
    <div className="admin-detail-item">
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function ReportDetailPanel({ report, products, orders, targetReports, loading, message, onClose }) {
  const [productPage, setProductPage] = useState(0);
  const [orderPage, setOrderPage] = useState(0);

  useEffect(() => {
    setProductPage(0);
    setOrderPage(0);
  }, [report?.reportId]);

  if (!report) return null;

  const memberStatus = getTargetMemberStatus(report);
  const sellerGrade = getTargetSellerGrade(report);
  const reportHistory = getReportHistorySummary(report, targetReports);
  const productTotalPages = Math.ceil(products.length / DETAIL_SUMMARY_PAGE_SIZE);
  const orderTotalPages = Math.ceil(orders.length / DETAIL_SUMMARY_PAGE_SIZE);
  const pagedProducts = getPagedItems(products, productPage);
  const pagedOrders = getPagedItems(orders, orderPage);

  return (
    <section className="admin-card report-detail-panel">
      <div className="report-detail-head">
        <div>
          <h2>신고 상세 확인</h2>
          <p>관리자 페이지 내부에서 신고 판단에 필요한 정보를 확인합니다.</p>
        </div>
        <button type="button" onClick={onClose}>닫기</button>
      </div>

      <div className="report-detail-grid">
        <section className="report-detail-section">
          <h3>신고자 기본 정보</h3>
          <dl className="report-detail-list">
            <DetailItem label="신고번호" value={report.reportId} />
            <DetailItem label="신고자" value={report.reporterNickname || report.reporterUserid} />
            <DetailItem label="신고 사유" value={REASON_LABELS[report.reasonCode] || report.reasonCode} />
            <DetailItem label="신고 상태" value={REPORT_STATUS_LABELS[report.status] || report.status} />
            <DetailItem label="신고일" value={formatDate(report.createdAt)} />
          </dl>
          <div className="report-detail-text">
            <span>신고 내용</span>
            <p>{report.detail || report.description || report.content || "-"}</p>
          </div>
        </section>

        <section className="report-detail-section">
          <h3>신고 대상 회원 정보</h3>
          <dl className="report-detail-list">
            <DetailItem label="member_id" value={getTargetMemberId(report)} />
            <DetailItem label="userid / nickname" value={getTargetMemberName(report)} />
            <DetailItem label="회원 상태" value={MEMBER_STATUS_LABELS[memberStatus] || memberStatus} />
            <DetailItem label="판매자 등급" value={SELLER_GRADE_LABELS[sellerGrade] || sellerGrade} />
          </dl>
          <div className="report-history-box">
            <div className="report-history-head">
              <span>신고 누적 이력</span>
              <strong>{reportHistory.available ? `총 신고 ${reportHistory.total}회` : "확인 필요"}</strong>
            </div>
            {reportHistory.available ? (
              <ul>
                {Object.keys(REASON_LABELS).map((reasonCode) => (
                  <li key={reasonCode}>
                    <span>{REASON_LABELS[reasonCode]}</span>
                    <strong>{reportHistory.counts[reasonCode] || 0}회</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>기존 신고 API 응답에서 대상 회원의 누적 신고 이력을 확인할 수 없습니다.</p>
            )}
          </div>
        </section>
      </div>

      {loading && <p className="admin-inquiry-message">신고 대상 회원의 관련 정보를 불러오는 중입니다.</p>}
      {message && <p className="admin-inquiry-message">{message}</p>}

      <div className="report-summary-grid">
        <section className="report-detail-section">
          <h3>신고 대상 회원 판매글 요약</h3>
          <div className="admin-table-wrap">
            <table className="admin-table report-summary-table">
              <thead>
                <tr>
                  <th>상품ID</th>
                  <th>상품명</th>
                  <th>상태</th>
                  <th>가격</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="admin-inquiry-empty">기존 API 응답에서 표시할 판매글이 없습니다.</td>
                  </tr>
                ) : (
                  pagedProducts.map((product) => (
                    <tr key={String(product.productId)}>
                      <td>{product.productId ?? "-"}</td>
                      <td title={product.title || ""}>{product.title || "-"}</td>
                      <td>{product.productStatus || "-"}</td>
                      <td>{formatPrice(product.price)}</td>
                      <td>{formatDate(product.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <SummaryPagination page={productPage} totalPages={productTotalPages} onChange={setProductPage} />
        </section>

        <section className="report-detail-section">
          <h3>신고 대상 회원 주문 요약</h3>
          <div className="admin-table-wrap">
            <table className="admin-table report-summary-table">
              <thead>
                <tr>
                  <th>주문ID</th>
                  <th>상품명</th>
                  <th>구매자</th>
                  <th>판매자</th>
                  <th>상태</th>
                  <th>결제일</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin-inquiry-empty">기존 API 응답에서 표시할 주문이 없습니다.</td>
                  </tr>
                ) : (
                  pagedOrders.map((order) => (
                    <tr key={String(order.orderId)}>
                      <td>{order.orderId ?? "-"}</td>
                      <td title={order.productTitle || ""}>{order.productTitle || "-"}</td>
                      <td>{order.buyerNickname || order.buyerUserid || "-"}</td>
                      <td>{order.sellerNickname || order.sellerUserid || "-"}</td>
                      <td>{ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus || "-"}</td>
                      <td>{formatDate(order.paidAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <SummaryPagination page={orderPage} totalPages={orderTotalPages} onChange={setOrderPage} />
        </section>
      </div>
    </section>
  );
}

function AdminReportsPage() {
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState(DEFAULT_REPORT_SORT);
  const [appliedSort, setAppliedSort] = useState(DEFAULT_REPORT_SORT);
  const [page, setPage] = useState(0);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [targetProducts, setTargetProducts] = useState([]);
  const [targetOrders, setTargetOrders] = useState([]);
  const [targetReports, setTargetReports] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [openActionReportId, setOpenActionReportId] = useState(null);
  const [selectedRejectReport, setSelectedRejectReport] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectMessage, setRejectMessage] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [selectedPenalizeReport, setSelectedPenalizeReport] = useState(null);
  const [penaltyType, setPenaltyType] = useState("WARNING");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyDays, setPenaltyDays] = useState(3);
  const [penaltyMessage, setPenaltyMessage] = useState("");
  const [penaltySubmitting, setPenaltySubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
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

  const pageNumbers = useMemo(
    () => getPageNumbers(pageInfo.pageNumber, pageInfo.totalPages),
    [pageInfo.pageNumber, pageInfo.totalPages],
  );

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getAdminReports({
          page,
          size: PAGE_SIZE,
          keyword: appliedKeyword,
          targetType: REPORT_TARGET_TYPE,
          reasonCode,
          status,
          sort: appliedSort,
        });

        if (ignore) return;

        const content = Array.isArray(data?.content) ? data.content : [];
        const filteredReports = content.filter((report) => !report?.targetType || report.targetType === REPORT_TARGET_TYPE);
        setReports(filteredReports);
        setSelectedReport((current) => {
          if (!current?.reportId) return current;
          const refreshedReport = filteredReports.find((report) => report.reportId === current.reportId);
          return refreshedReport ? { ...current, ...refreshedReport } : current;
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

        setReports([]);
        setPageInfo((current) => ({
          ...current,
          pageNumber: 0,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        }));
        setErrorMessage(error.message || "신고 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadReports();

    return () => {
      ignore = true;
    };
  }, [appliedKeyword, appliedSort, page, reasonCode, status, reloadKey]);

  useEffect(() => {
    function closeActionMenu() {
      setOpenActionReportId(null);
    }

    document.addEventListener("click", closeActionMenu);
    return () => document.removeEventListener("click", closeActionMenu);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadReportTargetSummaries() {
      if (!selectedReport) {
        setTargetProducts([]);
        setTargetOrders([]);
        setTargetReports([]);
        setDetailMessage("");
        return;
      }

      const targetKeyword = getTargetKeyword(selectedReport);
      if (!targetKeyword) {
        setTargetProducts([]);
        setTargetOrders([]);
        setTargetReports([]);
        setDetailMessage("신고 대상 회원 식별 필드가 부족해 판매글/주문 요약을 조회할 수 없습니다.");
        return;
      }

      setDetailLoading(true);
      setDetailMessage("");

      try {
        const [productsData, ordersData, reportHistory] = await Promise.all([
          getAdminProducts({
            page: 0,
            size: DETAIL_SUMMARY_FETCH_SIZE,
            sellerKeyword: targetKeyword,
            sort: PRODUCT_SORT,
          }),
          getAdminOrders({
            page: 0,
            size: DETAIL_SUMMARY_FETCH_SIZE,
            keyword: targetKeyword,
            sort: ORDER_SORT,
          }),
          fetchTargetReportHistory(targetKeyword),
        ]);

        if (ignore) return;

        setTargetProducts(sortByIdAsc(getListContent(productsData), "productId"));
        setTargetOrders(sortByIdAsc(getListContent(ordersData), "orderId"));
        setTargetReports(sortByIdAsc(reportHistory, "reportId"));
      } catch (error) {
        if (ignore) return;
        setTargetProducts([]);
        setTargetOrders([]);
        setTargetReports([]);
        setDetailMessage(error.message || "신고 대상 회원 관련 정보를 기존 API로 불러오지 못했습니다.");
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    loadReportTargetSummaries();

    return () => {
      ignore = true;
    };
  }, [selectedReport]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setPage(0);
    setAppliedKeyword(keyword.trim());
    setAppliedSort(sort);
  }

  function handleReasonChange(event) {
    setReasonCode(event.target.value);
    setPage(0);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    const nextSort = event.target.value;
    setSort(nextSort);
    setAppliedSort(nextSort);
    setPage(0);
  }

  function handleActionMenuClick(action, report) {
    setOpenActionReportId(null);
    if (action === "상세보기") {
      setSelectedReport(report);
      return;
    }

    if (action === "반려처리") {
      if (report?.status !== "APPROVED") {
        setErrorMessage("승인 상태의 신고만 반려처리할 수 있습니다.");
        return;
      }

      setSelectedRejectReport(report);
      setRejectReason("");
      setRejectMessage("");
      return;
    }

    if (action === "제재처리") {
      if (report?.status !== "APPROVED") {
        setErrorMessage("승인 상태의 신고만 제재처리할 수 있습니다.");
        return;
      }

      setSelectedPenalizeReport(report);
      setPenaltyType("WARNING");
      setPenaltyReason("");
      setPenaltyDays(3);
      setPenaltyMessage("");
      return;
    }

    console.log("[admin reports action]", action, report?.reportId);
  }

  function updateProcessedReport(updatedReport, fallbackReportId) {
    const targetReportId = updatedReport?.reportId ?? fallbackReportId;
    if (!targetReportId) return;

    setReports((current) => (
      current.map((report) => (
        report.reportId === targetReportId
          ? { ...report, ...updatedReport }
          : report
      ))
    ));

    setSelectedReport((current) => (
      current?.reportId === targetReportId
        ? { ...current, ...updatedReport }
        : current
    ));
  }

  function closeRejectModal() {
    if (rejectSubmitting) return;
    setSelectedRejectReport(null);
    setRejectReason("");
    setRejectMessage("");
  }

  async function handleRejectSubmit(event) {
    event.preventDefault();

    const reason = rejectReason.trim();
    if (!reason) {
      setRejectMessage("반려 사유를 입력해주세요.");
      return;
    }

    if (reason.length > 500) {
      setRejectMessage("반려 사유는 500자 이내로 입력해주세요.");
      return;
    }

    if (!selectedRejectReport?.reportId) {
      setRejectMessage("신고 정보를 확인할 수 없습니다.");
      return;
    }

    setRejectSubmitting(true);
    setRejectMessage("");

    try {
      const updatedReport = await rejectAdminReport(selectedRejectReport.reportId, reason);
      updateProcessedReport(updatedReport, selectedRejectReport.reportId);
      setSelectedRejectReport(null);
      setRejectReason("");
      setSuccessMessage("신고 반려처리가 완료되었습니다.");
      setReloadKey((current) => current + 1);
    } catch (error) {
      setRejectMessage(error.message || "신고 반려처리에 실패했습니다.");
    } finally {
      setRejectSubmitting(false);
    }
  }

  function closePenalizeModal() {
    if (penaltySubmitting) return;
    setSelectedPenalizeReport(null);
    setPenaltyType("WARNING");
    setPenaltyReason("");
    setPenaltyDays(3);
    setPenaltyMessage("");
  }

  async function handlePenalizeSubmit(event) {
    event.preventDefault();

    const reason = penaltyReason.trim();
    if (!reason) {
      setPenaltyMessage("제재 사유를 입력해주세요.");
      return;
    }

    if (reason.length > 500) {
      setPenaltyMessage("제재 사유는 500자 이내로 입력해주세요.");
      return;
    }

    if (!selectedPenalizeReport?.reportId) {
      setPenaltyMessage("신고 정보를 확인할 수 없습니다.");
      return;
    }

    const payload = {
      penaltyType,
      reason,
    };

    if (penaltyType === "SUSPEND") {
      payload.penaltyDays = Number(penaltyDays);
    }

    setPenaltySubmitting(true);
    setPenaltyMessage("");

    try {
      const updatedReport = await penalizeAdminReport(selectedPenalizeReport.reportId, payload);
      updateProcessedReport(updatedReport, selectedPenalizeReport.reportId);
      setSelectedPenalizeReport(null);
      setPenaltyType("WARNING");
      setPenaltyReason("");
      setPenaltyDays(3);
      setSuccessMessage("신고 제재처리가 완료되었습니다.");
      setReloadKey((current) => current + 1);
    } catch (error) {
      setPenaltyMessage(error.message || "신고 제재처리에 실패했습니다.");
    } finally {
      setPenaltySubmitting(false);
    }
  }

  return (
    <div className="admin-page admin-reports-page">
      <div className="admin-content-main">
        <section className="admin-card search-filter-card">
          <form className="filter-row admin-filter-row-report" onSubmit={handleSearchSubmit}>
            <div className="filter-field search-field">
              <label htmlFor="admin-report-search">신고 검색</label>
              <div className="filter-input">
                <input
                  id="admin-report-search"
                  type="search"
                  placeholder="신고번호, 신고자, 대상 회원, 사유 검색"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-report-reason">신고 사유</label>
              <select id="admin-report-reason" value={reasonCode} onChange={handleReasonChange}>
                <option value="">전체</option>
                <option value="FRAUD">사기 의심</option>
                <option value="MISLEADING_INFO">상품 정보 허위/불일치</option>
                <option value="PROHIBITED_ITEM">금지 품목</option>
                <option value="ETC">기타</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-report-status">처리 상태</label>
              <select id="admin-report-status" value={status} onChange={handleStatusChange}>
                <option value="">전체</option>
                <option value="APPROVED">승인</option>
                <option value="REJECTED">반려</option>
                <option value="DONE">완료</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-report-sort">신고 등록일</label>
              <select id="admin-report-sort" value={sort} onChange={handleSortChange}>
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
              신고 목록 <span>(총 {pageInfo.totalElements}건)</span>
            </h2>
          </div>


          <div className="admin-table-wrap">
            <table className="admin-table admin-report-table">
              <thead>
                <tr>
                  <th>신고번호</th>
                  <th>신고자</th>
                  <th>대상 유형</th>
                  <th>대상 회원</th>
                  <th>신고 사유</th>
                  <th>상세 내용</th>
                  <th>처리 상태</th>
                  <th>처리 사유</th>
                  <th>처리일</th>
                  <th>신고일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="admin-inquiry-empty">
                      신고 목록을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="admin-inquiry-empty">
                      신고 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr
                      className={`report-click-row ${selectedReport?.reportId === report.reportId ? "is-selected" : ""}`}
                      key={String(report.reportId)}
                      onClick={() => setSelectedReport(report)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedReport(report);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td>{String(report.reportId || "-")}</td>
                      <td title={report.reporterId || ""}>
                        {report.reporterNickname || report.reporterUserid || "-"}
                      </td>
                      <td>{TARGET_TYPE_LABELS[report.targetType] || report.targetType || "-"}</td>
                      <td title={report.targetId || ""}>{report.targetName || "-"}</td>
                      <td>{REASON_LABELS[report.reasonCode] || report.reasonCode || "-"}</td>
                      <td title={report.detail || ""}>{report.detail || "-"}</td>
                      <td>
                        <span className={`status-badge ${REPORT_STATUS_CLASS_NAMES[report.status] || "gray"}`}>
                          {REPORT_STATUS_LABELS[report.status] || report.status || "-"}
                        </span>
                      </td>
                      <td title={report.processedReason || ""}>{report.processedReason || "-"}</td>
                      <td>{formatDate(report.processedAt)}</td>
                      <td>{formatDate(report.createdAt)}</td>
                      <td
                        className="row-action-cell"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <button
                          className="row-action-button"
                          type="button"
                          aria-expanded={openActionReportId === report.reportId}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionReportId((current) => (
                              current === report.reportId ? null : report.reportId
                            ));
                          }}
                        >
                          관리
                        </button>
                        {openActionReportId === report.reportId && (
                          <div className="row-action-menu">
                            {[
                              { label: "상세보기" },
                              { label: "반려처리", disabled: report.status !== "APPROVED" },
                              { label: "제재처리", disabled: report.status !== "APPROVED" },
                            ].map((action) => (
                              <button
                                type="button"
                                key={action.label}
                                disabled={action.disabled}
                                title={action.disabled ? "승인 상태의 신고만 처리할 수 있습니다." : undefined}
                                onClick={() => handleActionMenuClick(action.label, report)}
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

        <ReportDetailPanel
          report={selectedReport}
          products={targetProducts}
          orders={targetOrders}
          targetReports={targetReports}
          loading={detailLoading}
          message={detailMessage}
          onClose={() => setSelectedReport(null)}
        />
      </div>

      {selectedRejectReport && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={closeRejectModal}>
          <section
            className="admin-detail-modal admin-report-process-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-report-reject-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-report-reject-title">반려처리</h2>
              <button type="button" aria-label="반려처리 닫기" onClick={closeRejectModal}>
                ×
              </button>
            </div>
            <form className="admin-detail-form" onSubmit={handleRejectSubmit}>
              <dl className="admin-detail-grid admin-detail-grid-compact">
                <ModalDetailItem label="신고 ID" value={selectedRejectReport.reportId} />
                <ModalDetailItem label="신고자" value={selectedRejectReport.reporterNickname || selectedRejectReport.reporterUserid} />
                <ModalDetailItem label="신고 대상 회원" value={getTargetMemberName(selectedRejectReport)} />
                <ModalDetailItem label="신고 사유" value={REASON_LABELS[selectedRejectReport.reasonCode] || selectedRejectReport.reasonCode} />
                <ModalDetailItem label="현재 처리 상태" value={REPORT_STATUS_LABELS[selectedRejectReport.status] || selectedRejectReport.status} />
              </dl>

              <label className="admin-detail-field" htmlFor="admin-report-reject-reason">
                <span>반려 사유</span>
                <textarea
                  id="admin-report-reject-reason"
                  className="admin-detail-textarea"
                  value={rejectReason}
                  maxLength={500}
                  placeholder="반려 사유를 입력하세요."
                  disabled={rejectSubmitting}
                  onChange={(event) => {
                    setRejectReason(event.target.value);
                    setRejectMessage("");
                  }}
                />
              </label>
              <div className="admin-detail-helper">{rejectReason.length}/500</div>
              {rejectMessage && <p className="admin-detail-error">{rejectMessage}</p>}

              <div className="admin-detail-modal-actions">
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={rejectSubmitting}
                  onClick={closeRejectModal}
                >
                  취소
                </button>
                <button className="admin-detail-danger-button" type="submit" disabled={rejectSubmitting}>
                  {rejectSubmitting ? "처리 중" : "반려처리"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedPenalizeReport && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={closePenalizeModal}>
          <section
            className="admin-detail-modal admin-report-process-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-report-penalize-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-report-penalize-title">제재처리</h2>
              <button type="button" aria-label="제재처리 닫기" onClick={closePenalizeModal}>
                ×
              </button>
            </div>
            <form className="admin-detail-form" onSubmit={handlePenalizeSubmit}>
              <dl className="admin-detail-grid admin-detail-grid-compact">
                <ModalDetailItem label="신고 ID" value={selectedPenalizeReport.reportId} />
                <ModalDetailItem label="신고 대상 회원" value={getTargetMemberName(selectedPenalizeReport)} />
                <ModalDetailItem label="신고 사유" value={REASON_LABELS[selectedPenalizeReport.reasonCode] || selectedPenalizeReport.reasonCode} />
                <ModalDetailItem label="현재 처리 상태" value={REPORT_STATUS_LABELS[selectedPenalizeReport.status] || selectedPenalizeReport.status} />
              </dl>

              <div className="admin-report-process-note">
                신고 대상 회원에게 제재가 적용됩니다.
              </div>

              {getReportDetailText(selectedPenalizeReport) && (
                <div className="admin-report-process-detail">
                  <span>신고 상세 내용</span>
                  <p>{getReportDetailText(selectedPenalizeReport)}</p>
                </div>
              )}

              <label className="admin-detail-field" htmlFor="admin-report-penalty-type">
                <span>제재 유형</span>
                <select
                  id="admin-report-penalty-type"
                  className="admin-detail-select"
                  value={penaltyType}
                  disabled={penaltySubmitting}
                  onChange={(event) => {
                    setPenaltyType(event.target.value);
                    setPenaltyMessage("");
                  }}
                >
                  {Object.entries(PENALTY_TYPE_LABELS).map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
              </label>

              {penaltyType === "SUSPEND" && (
                <label className="admin-detail-field" htmlFor="admin-report-penalty-days">
                  <span>정지 기간</span>
                  <select
                    id="admin-report-penalty-days"
                    className="admin-detail-select"
                    value={penaltyDays}
                    disabled={penaltySubmitting}
                    onChange={(event) => setPenaltyDays(Number(event.target.value))}
                  >
                    <option value={3}>3일</option>
                    <option value={7}>7일</option>
                    <option value={30}>30일</option>
                  </select>
                </label>
              )}

              <label className="admin-detail-field" htmlFor="admin-report-penalty-reason">
                <span>제재 사유</span>
                <textarea
                  id="admin-report-penalty-reason"
                  className="admin-detail-textarea"
                  value={penaltyReason}
                  maxLength={500}
                  placeholder="제재 사유를 입력하세요."
                  disabled={penaltySubmitting}
                  onChange={(event) => {
                    setPenaltyReason(event.target.value);
                    setPenaltyMessage("");
                  }}
                />
              </label>
              <div className="admin-detail-helper">{penaltyReason.length}/500</div>
              {penaltyMessage && <p className="admin-detail-error">{penaltyMessage}</p>}

              <div className="admin-detail-modal-actions">
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={penaltySubmitting}
                  onClick={closePenalizeModal}
                >
                  취소
                </button>
                <button className="admin-detail-danger-button" type="submit" disabled={penaltySubmitting}>
                  {penaltySubmitting ? "처리 중" : "제재처리"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminReportsPage;
