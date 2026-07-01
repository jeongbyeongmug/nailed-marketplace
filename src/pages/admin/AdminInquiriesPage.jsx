import { useEffect, useMemo, useState } from "react";
import {
  answerAdminInquiry,
  fetchAdminInquiries,
  fetchAdminInquiryDetail,
} from "../../api/inquiryApi";

const CATEGORY_LABELS = {
  ORDER: "주문 문의",
  PAYMENT: "결제 문의",
  PRODUCT: "상품 문의",
  DELIVERY: "배송 문의",
  ACCOUNT: "회원/계정 문의",
  ETC: "기타 문의",
};

const STATUS_LABELS = {
  PENDING: "답변 대기",
  ANSWERED: "답변 완료",
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "PENDING", label: "답변 대기" },
  { value: "ANSWERED", label: "답변 완료" },
];

const PAGE_SIZE = 10;

function toList(data) {
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
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

function getPageInfo(data, fallbackPage) {
  const pageData = data?.data || data || {};

  return {
    pageNumber: pageData.pageNumber ?? pageData.number ?? fallbackPage,
    pageSize: pageData.pageSize ?? pageData.size ?? PAGE_SIZE,
    totalElements: pageData.totalElements ?? toList(data).length,
    totalPages: pageData.totalPages ?? 1,
    first: pageData.first ?? fallbackPage === 0,
    last: pageData.last ?? (pageData.totalPages ? fallbackPage >= pageData.totalPages - 1 : true),
  };
}


function normalizeInquiry(inquiry) {
  return {
    inquiryId: inquiry?.inquiryId || "",
    memberId: inquiry?.memberId || "",
    category: inquiry?.category || "",
    title: inquiry?.title || "제목 없음",
    content: inquiry?.content || "",
    inquiryStatus: inquiry?.inquiryStatus || "",
    answerContent: inquiry?.answerContent || "",
    createdAt: inquiry?.createdAt || "",
    answeredAt: inquiry?.answeredAt || "",
  };
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || "-";
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "-";
}

function AdminInquiriesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answerContent, setAnswerContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pageInfo, setPageInfo] = useState({
    pageNumber: 0,
    pageSize: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  });

  const pageNumbers = useMemo(
    () => getPageNumbers(pageInfo.pageNumber, pageInfo.totalPages),
    [pageInfo.pageNumber, pageInfo.totalPages],
  );

  async function loadInquiries(nextStatus = statusFilter, nextPage = page) {
    setLoading(true);
    setMessage("");

    try {
      const data = await fetchAdminInquiries({
        status: nextStatus,
        page: nextPage,
        size: PAGE_SIZE,
      });
      setInquiries(toList(data).map(normalizeInquiry));
      setPageInfo(getPageInfo(data, nextPage));
    } catch (error) {
      setMessage(error.message || "문의 목록을 불러올 수 없습니다.");
      setInquiries([]);
      setPageInfo((current) => ({
        ...current,
        pageNumber: 0,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInquiries(statusFilter, page);
  }, [page, statusFilter]);

  async function handleSelectInquiry(inquiryId) {
    if (!inquiryId) return;

    setDetailLoading(true);
    setMessage("");

    try {
      const data = await fetchAdminInquiryDetail(inquiryId);
      const detail = normalizeInquiry(data);
      setSelectedInquiry(detail);
      setAnswerContent("");
    } catch (error) {
      setMessage(error.message || "문의 상세를 불러올 수 없습니다.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSubmitAnswer(event) {
    event.preventDefault();

    if (!selectedInquiry?.inquiryId || selectedInquiry.inquiryStatus === "ANSWERED") return;

    const trimmedAnswer = answerContent.trim();
    if (!trimmedAnswer) {
      setMessage("답변 내용을 입력해주세요.");
      return;
    }

    setAnswerLoading(true);
    setMessage("");

    try {
      const data = await answerAdminInquiry(selectedInquiry.inquiryId, trimmedAnswer);
      const updatedInquiry = normalizeInquiry(data || {
        ...selectedInquiry,
        inquiryStatus: "ANSWERED",
        answerContent: trimmedAnswer,
      });

      setSelectedInquiry(updatedInquiry);
      setAnswerContent("");
      setStatusFilter("ANSWERED");
      setPage(0);
      await loadInquiries("ANSWERED", 0);
      setMessage("답변이 등록되었습니다.");
    } catch (error) {
      setMessage(error.message || "답변 등록에 실패했습니다.");
    } finally {
      setAnswerLoading(false);
    }
  }

  return (
    <div className="admin-page admin-inquiries-page">
      <section className="admin-card admin-inquiry-filter">
        <div className="filter-tabs">
          {STATUS_FILTERS.map((filter) => (
            <button
              type="button"
              className={statusFilter === filter.value ? "is-active" : ""}
              key={filter.value || "ALL"}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(0);
                setSelectedInquiry(null);
                setAnswerContent("");
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {message && <p className="admin-inquiry-message">{message}</p>}

      <div className="admin-inquiry-grid">
        <section className="admin-card table-card admin-inquiry-list-card">
          <div className="table-card-header">
            <h2>
              문의 목록 <span>(총 {pageInfo.totalElements}건)</span>
            </h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-inquiry-table">
              <thead>
                <tr>
                  <th>회원ID</th>
                  <th>유형</th>
                  <th>제목</th>
                  <th>상태</th>
                  <th>작성일</th>
                  <th>답변일</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="admin-inquiry-empty">문의 목록을 불러오는 중...</td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin-inquiry-empty">조회된 문의가 없습니다.</td>
                  </tr>
                ) : (
                  inquiries.map((inquiry) => (
                    <tr
                      className={selectedInquiry?.inquiryId === inquiry.inquiryId ? "is-selected" : ""}
                      key={inquiry.inquiryId}
                      onClick={() => handleSelectInquiry(inquiry.inquiryId)}
                    >
                      <td>{inquiry.memberId || "-"}</td>
                      <td>{getCategoryLabel(inquiry.category)}</td>
                      <td className="admin-inquiry-title-cell">{inquiry.title}</td>
                      <td>
                        <span className={`admin-inquiry-status ${inquiry.inquiryStatus === "ANSWERED" ? "answered" : ""}`}>
                          {getStatusLabel(inquiry.inquiryStatus)}
                        </span>
                      </td>
                      <td>{formatDateTime(inquiry.createdAt)}</td>
                      <td>{formatDateTime(inquiry.answeredAt)}</td>
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

        <section className="admin-card admin-inquiry-detail">
          {detailLoading && <p className="admin-inquiry-empty">문의 상세를 불러오는 중...</p>}

          {!detailLoading && !selectedInquiry && (
            <p className="admin-inquiry-empty">문의 항목을 선택하면 상세 내용과 답변 영역이 표시됩니다.</p>
          )}

          {!detailLoading && selectedInquiry && (
            <>
              <div className="admin-inquiry-detail-head">
                <span>{getCategoryLabel(selectedInquiry.category)}</span>
                <h2>{selectedInquiry.title}</h2>
                <span className={`admin-inquiry-status ${selectedInquiry.inquiryStatus === "ANSWERED" ? "answered" : ""}`}>
                  {getStatusLabel(selectedInquiry.inquiryStatus)}
                </span>
              </div>

              <dl className="admin-inquiry-meta">
                <div>
                  <dt>회원ID</dt>
                  <dd>{selectedInquiry.memberId || "-"}</dd>
                </div>
                <div>
                  <dt>작성일</dt>
                  <dd>{formatDateTime(selectedInquiry.createdAt)}</dd>
                </div>
                <div>
                  <dt>답변일</dt>
                  <dd>{formatDateTime(selectedInquiry.answeredAt)}</dd>
                </div>
              </dl>

              <div className="admin-inquiry-section">
                <h3>문의 내용</h3>
                <p>{selectedInquiry.content || "-"}</p>
              </div>

              <div className="admin-inquiry-section">
                <h3>답변 내용</h3>
                {selectedInquiry.inquiryStatus === "ANSWERED" ? (
                  <p>{selectedInquiry.answerContent || "-"}</p>
                ) : (
                  <form className="admin-inquiry-answer-form" onSubmit={handleSubmitAnswer}>
                    <textarea
                      value={answerContent}
                      onChange={(event) => setAnswerContent(event.target.value)}
                      placeholder="답변 내용을 입력해주세요."
                      rows="7"
                    />
                    <button type="submit" disabled={answerLoading}>
                      {answerLoading ? "등록 중..." : "답변 등록"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminInquiriesPage;
