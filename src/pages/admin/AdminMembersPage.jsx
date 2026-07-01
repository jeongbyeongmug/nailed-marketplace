import { useEffect, useMemo, useState } from "react";
import {
  createAdminMemberPenalty,
  fetchAdminMembers,
  getAdminMember,
  getAdminMemberPenalties,
  unsuspendAdminMember,
} from "../../api/adminApi";

const ROLE_LABELS = {
  ADMIN: "관리자",
  USER: "일반회원",
};

const STATUS_LABELS = {
  ACTIVE: "활동중",
  LOCKED: "잠금",
  WITHDRAWN: "탈퇴",
  SUSPEND: "정지",
  BANNED: "영구정지",
};

const STATUS_CLASS_NAMES = {
  ACTIVE: "mint",
  LOCKED: "orange",
  WITHDRAWN: "gray",
  SUSPEND: "orange",
  BANNED: "red",
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
const MEMBER_ROLE = "USER";
const DEFAULT_MEMBER_SORT = "";

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

function DetailItem({ label, value }) {
  const displayValue = value ?? "-";

  return (
    <div className="admin-detail-item">
      <dt>{label}</dt>
      <dd>{displayValue === "" ? "-" : displayValue}</dd>
    </div>
  );
}

function AdminMembersPage() {
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [sellerGrade, setSellerGrade] = useState("");
  const [sort, setSort] = useState(DEFAULT_MEMBER_SORT);
  const [appliedSort, setAppliedSort] = useState(DEFAULT_MEMBER_SORT);
  const [page, setPage] = useState(0);
  const [members, setMembers] = useState([]);
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
  const [openActionMemberId, setOpenActionMemberId] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [selectedPenaltyMember, setSelectedPenaltyMember] = useState(null);
  const [penaltyType, setPenaltyType] = useState("WARNING");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyDays, setPenaltyDays] = useState(7);
  const [penaltyMessage, setPenaltyMessage] = useState("");
  const [penaltySubmitting, setPenaltySubmitting] = useState(false);
  const [selectedPenaltyHistoryMember, setSelectedPenaltyHistoryMember] = useState(null);
  const [penaltyHistories, setPenaltyHistories] = useState([]);
  const [penaltyHistoryLoading, setPenaltyHistoryLoading] = useState(false);
  const [penaltyHistoryMessage, setPenaltyHistoryMessage] = useState("");
  const [selectedUnsuspendMember, setSelectedUnsuspendMember] = useState(null);
  const [unsuspendSubmitting, setUnsuspendSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const pageNumbers = useMemo(
    () => getPageNumbers(pageInfo.pageNumber, pageInfo.totalPages),
    [pageInfo.pageNumber, pageInfo.totalPages],
  );

  useEffect(() => {
    let ignore = false;

    async function loadMembers() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchAdminMembers({
          page,
          size: PAGE_SIZE,
          keyword: appliedKeyword,
          role: MEMBER_ROLE,
          status,
          sellerGrade,
          sort: appliedSort,
        });

        if (ignore) return;

        const content = Array.isArray(data?.content) ? data.content : [];
        setMembers(content.filter((member) => member?.role !== "ADMIN"));
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

        setMembers([]);
        setPageInfo((current) => ({
          ...current,
          pageNumber: 0,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        }));
        setErrorMessage(error.message || "회원 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadMembers();

    return () => {
      ignore = true;
    };
  }, [appliedKeyword, appliedSort, page, sellerGrade, status, reloadKey]);

  useEffect(() => {
    function closeActionMenu() {
      setOpenActionMemberId(null);
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
    setStatus(event.target.value);
    setPage(0);
  }

  function handleSellerGradeChange(event) {
    setSellerGrade(event.target.value);
    setPage(0);
  }

  function handleSortChange(event) {
    const nextSort = event.target.value;
    setSort(nextSort);
    setAppliedSort(nextSort);
    setPage(0);
  }

  async function handleActionMenuClick(action, member) {
    setOpenActionMemberId(null);
    if (action === "상세보기") {
      await openMemberDetailModal(member);
      return;
    }

    if (action === "제재등록") {
      if (member?.status === "WITHDRAWN" || member?.status === "BANNED") {
        setErrorMessage("탈퇴 또는 영구정지 회원은 제재등록을 할 수 없습니다.");
        return;
      }

      setSelectedPenaltyMember(member);
      setPenaltyType("WARNING");
      setPenaltyReason("");
      setPenaltyDays(7);
      setPenaltyMessage("");
      return;
    }

    if (action === "제재이력") {
      openPenaltyHistoryModal(member);
      return;
    }

    if (action === "회원복구") {
      if (member?.status !== "SUSPEND" && member?.status !== "BANNED") {
        setErrorMessage("정지 또는 영구정지 상태의 회원만 복구할 수 있습니다.");
        return;
      }

      setSelectedUnsuspendMember(member);
      return;
    }

    console.log("[admin members action]", action, member?.memberId);
  }

  async function openMemberDetailModal(member) {
    if (!member?.memberId) return;

    setMemberDetailLoading(true);
    setErrorMessage("");

    try {
      const detail = await getAdminMember(member.memberId);
      setSelectedMember({
        ...member,
        ...detail,
        status: detail?.memberStatus || detail?.status || member.status,
      });
    } catch (error) {
      setErrorMessage(error.message || "회원 상세 조회에 실패했습니다.");
    } finally {
      setMemberDetailLoading(false);
    }
  }

  function closePenaltyModal() {
    if (penaltySubmitting) return;
    setSelectedPenaltyMember(null);
    setPenaltyType("WARNING");
    setPenaltyReason("");
    setPenaltyDays(7);
    setPenaltyMessage("");
  }

  async function handlePenaltySubmit(event) {
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

    if (!selectedPenaltyMember?.memberId) {
      setPenaltyMessage("회원 정보를 확인할 수 없습니다.");
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
      await createAdminMemberPenalty(selectedPenaltyMember.memberId, payload);
      setSelectedPenaltyMember(null);
      setPenaltyType("WARNING");
      setPenaltyReason("");
      setPenaltyDays(7);
      setReloadKey((current) => current + 1);
    } catch (error) {
    } finally {
      setPenaltySubmitting(false);
    }
  }

  async function openPenaltyHistoryModal(member) {
    setSelectedPenaltyHistoryMember(member);
    setPenaltyHistories([]);
    setPenaltyHistoryMessage("");
    setPenaltyHistoryLoading(true);

    try {
      const data = await getAdminMemberPenalties(member.memberId);
      const histories = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data?.penalties)
            ? data.penalties
            : [];
      setPenaltyHistories(histories);
    } catch (error) {
      setPenaltyHistoryMessage(error.message || "제재이력 조회에 실패했습니다.");
    } finally {
      setPenaltyHistoryLoading(false);
    }
  }

  function closePenaltyHistoryModal() {
    setSelectedPenaltyHistoryMember(null);
    setPenaltyHistories([]);
    setPenaltyHistoryMessage("");
    setPenaltyHistoryLoading(false);
  }

  async function handleUnsuspendConfirm() {
    if (!selectedUnsuspendMember?.memberId) return;
    setUnsuspendSubmitting(true);

    try {
      await unsuspendAdminMember(selectedUnsuspendMember.memberId);
      setSelectedUnsuspendMember(null);
      
      setReloadKey((current) => current + 1);
    } catch (error) {
    
      setSelectedUnsuspendMember(null);
    } finally {
      setUnsuspendSubmitting(false);
    }
  }

  return (
    <div className="admin-page admin-members-page">
      <div className="admin-content-main">
        <section className="admin-card search-filter-card">
          <form className="filter-row admin-filter-row-member" onSubmit={handleSearchSubmit}>
            <div className="filter-field search-field">
              <label htmlFor="admin-member-search">회원 검색</label>
              <div className="filter-input">
                <input
                  id="admin-member-search"
                  type="search"
                  placeholder="회원ID, 로그인ID, 닉네임, 이름 검색"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-member-status">상태</label>
              <select id="admin-member-status" value={status} onChange={handleStatusChange}>
                <option value="">전체</option>
                <option value="ACTIVE">활동중</option>
                <option value="LOCKED">잠금</option>
                <option value="WITHDRAWN">탈퇴</option>
                <option value="SUSPEND">정지</option>
                <option value="BANNED">영구정지</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-member-seller-grade">판매등급</label>
              <select id="admin-member-seller-grade" value={sellerGrade} onChange={handleSellerGradeChange}>
                <option value="">전체</option>
                {Object.entries(SELLER_GRADE_LABELS).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="admin-member-sort">가입일</label>
              <select id="admin-member-sort" value={sort} onChange={handleSortChange}>
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
              회원 목록 <span>(총 {pageInfo.totalElements}건)</span>
            </h2>
          </div>

          {errorMessage && <p className="admin-inquiry-message">{errorMessage}</p>}
          {successMessage && <p className="admin-inquiry-message is-success">{successMessage}</p>}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>회원ID</th>
                  <th>아이디</th>
                  <th>닉네임</th>
                  <th>권한</th>
                  <th>판매등급</th>
                  <th>상태</th>
                  <th>가입일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="admin-inquiry-empty">
                      회원 목록을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="admin-inquiry-empty">
                      회원 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.memberId}>
                      <td>{member.memberId || "-"}</td>
                      <td>{member.userid || "-"}</td>
                      <td>{member.nickname || "-"}</td>
                      <td>{ROLE_LABELS[member.role] || member.role || "-"}</td>
                      <td>{member.sellerGrade || "-"}</td>
                      <td>
                        <span className={`status-badge ${STATUS_CLASS_NAMES[member.status] || "gray"}`}>
                          {STATUS_LABELS[member.status] || member.status || "-"}
                        </span>
                      </td>
                      <td>{formatDate(member.createdAt)}</td>
                      <td className="row-action-cell" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="row-action-button"
                          type="button"
                          aria-expanded={openActionMemberId === member.memberId}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionMemberId((current) => (current === member.memberId ? null : member.memberId));
                          }}
                        >
                          관리
                        </button>
                        {openActionMemberId === member.memberId && (
                          <div className="row-action-menu">
                            {[
                              { label: "상세보기" },
                              {
                                label: "제재등록",
                                disabled: member.status === "WITHDRAWN" || member.status === "BANNED",
                                title: "탈퇴 또는 영구정지 회원은 제재등록을 할 수 없습니다.",
                              },
                              { label: "제재이력" },
                              {
                                label: "회원복구",
                                disabled: member.status !== "SUSPEND" && member.status !== "BANNED",
                                title: "정지 또는 영구정지 상태의 회원만 복구할 수 있습니다.",
                              },
                            ].map((action) => (
                              <button
                                type="button"
                                key={action.label}
                                disabled={action.disabled}
                                title={action.disabled ? action.title : undefined}
                                onClick={() => handleActionMenuClick(action.label, member)}
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

      {selectedMember && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={() => setSelectedMember(null)}>
          <section
            className="admin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-member-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-member-detail-title">회원 상세</h2>
              <button type="button" aria-label="회원 상세 닫기" onClick={() => setSelectedMember(null)}>
                ×
              </button>
            </div>
            <dl className="admin-detail-grid">
              <DetailItem label="회원 ID" value={selectedMember.memberId} />
              <DetailItem label="아이디" value={selectedMember.userid} />
              <DetailItem label="닉네임" value={selectedMember.nickname} />
              <DetailItem label="이름" value={selectedMember.name || selectedMember.memberName} />
              <DetailItem label="권한" value={ROLE_LABELS[selectedMember.role] || selectedMember.role} />
              <DetailItem
                label="회원 상태"
                value={STATUS_LABELS[selectedMember.memberStatus || selectedMember.status] || selectedMember.memberStatus || selectedMember.status}
              />
              <DetailItem label="판매등급" value={selectedMember.sellerGrade} />
              <DetailItem label="가입일" value={formatDate(selectedMember.createdAt)} />
              <DetailItem label="최근 수정일" value={formatDate(selectedMember.updatedAt)} />
              <DetailItem label="마지막 로그인일" value={formatDate(selectedMember.lastLoginAt)} />
              <DetailItem label="로그인 횟수" value={selectedMember.loginCount} />
              <DetailItem label="로그인 실패 횟수" value={selectedMember.loginFailCount} />
            </dl>
          </section>
        </div>
      )}

      {selectedPenaltyMember && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={closePenaltyModal}>
          <section
            className="admin-detail-modal admin-member-penalty-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-member-penalty-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-member-penalty-title">제재등록</h2>
              <button type="button" aria-label="제재등록 닫기" onClick={closePenaltyModal}>
                ×
              </button>
            </div>
            <form className="admin-detail-form" onSubmit={handlePenaltySubmit}>
              <dl className="admin-detail-grid admin-detail-grid-compact">
                <DetailItem label="회원 ID" value={selectedPenaltyMember.memberId} />
                <DetailItem label="아이디" value={selectedPenaltyMember.userid} />
                <DetailItem label="닉네임" value={selectedPenaltyMember.nickname} />
                <DetailItem
                  label="현재 회원 상태"
                  value={STATUS_LABELS[selectedPenaltyMember.status] || selectedPenaltyMember.status}
                />
              </dl>

              <label className="admin-detail-field" htmlFor="admin-member-penalty-type">
                <span>제재 유형</span>
                <select
                  id="admin-member-penalty-type"
                  className="admin-detail-select"
                  value={penaltyType}
                  disabled={penaltySubmitting}
                  onChange={(event) => {
                    setPenaltyType(event.target.value);
                    setPenaltyMessage("");
                  }}
                >
                  <option value="WARNING">경고</option>
                  <option value="SUSPEND">정지</option>
                  <option value="BAN">영구정지</option>
                </select>
              </label>

              {penaltyType === "SUSPEND" && (
                <label className="admin-detail-field" htmlFor="admin-member-penalty-days">
                  <span>정지 기간</span>
                  <select
                    id="admin-member-penalty-days"
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

              <label className="admin-detail-field" htmlFor="admin-member-penalty-reason">
                <span>제재 사유</span>
                <textarea
                  id="admin-member-penalty-reason"
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
                  onClick={closePenaltyModal}
                >
                  취소
                </button>
                <button className="admin-detail-danger-button" type="submit" disabled={penaltySubmitting}>
                  {penaltySubmitting ? "등록 중" : "제재등록"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedPenaltyHistoryMember && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={closePenaltyHistoryModal}>
          <section
            className="admin-detail-modal admin-member-penalty-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-member-penalty-history-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-member-penalty-history-title">제재이력</h2>
              <button type="button" aria-label="제재이력 닫기" onClick={closePenaltyHistoryModal}>
                ×
              </button>
            </div>
            <div className="admin-detail-form">
              <dl className="admin-detail-grid admin-detail-grid-compact">
                <DetailItem label="회원 ID" value={selectedPenaltyHistoryMember.memberId} />
                <DetailItem label="아이디" value={selectedPenaltyHistoryMember.userid} />
                <DetailItem label="닉네임" value={selectedPenaltyHistoryMember.nickname} />
                <DetailItem
                  label="현재 회원 상태"
                  value={STATUS_LABELS[selectedPenaltyHistoryMember.status] || selectedPenaltyHistoryMember.status}
                />
              </dl>

              {penaltyHistoryLoading ? (
                <p className="admin-inquiry-empty">제재이력을 불러오는 중입니다.</p>
              ) : penaltyHistoryMessage ? (
                <p className="admin-detail-error">{penaltyHistoryMessage}</p>
              ) : penaltyHistories.length === 0 ? (
                <p className="admin-inquiry-empty">등록된 제재 이력이 없습니다.</p>
              ) : (
                <div className="admin-penalty-history-list">
                  <table>
                    <thead>
                      <tr>
                        <th>제재번호</th>
                        <th>제재유형</th>
                        <th>사유</th>
                        <th>기간</th>
                        <th>시작일</th>
                        <th>종료일</th>
                        <th>등록일</th>
                        <th>신고ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {penaltyHistories.map((penalty) => (
                        <tr key={penalty.penaltyId ?? `${penalty.memberId}-${penalty.createdAt}`}>
                          <td>{penalty.penaltyId ?? "-"}</td>
                          <td>{PENALTY_TYPE_LABELS[penalty.penaltyType] || penalty.penaltyType || "-"}</td>
                          <td title={penalty.reason || ""}>{penalty.reason || "-"}</td>
                          <td>{penalty.penaltyDays ? `${penalty.penaltyDays}일` : "-"}</td>
                          <td>{formatDate(penalty.startsAt)}</td>
                          <td>{formatDate(penalty.endsAt)}</td>
                          <td>{formatDate(penalty.createdAt)}</td>
                          <td>{penalty.reportId ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedUnsuspendMember && (
        <div className="admin-detail-modal-backdrop" role="presentation" onClick={() => !unsuspendSubmitting && setSelectedUnsuspendMember(null)}>
          <section
            className="admin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-member-unsuspend-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-detail-modal-head">
              <h2 id="admin-member-unsuspend-title">회원 복구</h2>
              <button type="button" aria-label="회원 복구 닫기" onClick={() => !unsuspendSubmitting && setSelectedUnsuspendMember(null)}>
                ×
              </button>
            </div>
            <div className="admin-detail-form">
              <dl className="admin-detail-grid admin-detail-grid-compact">
                <DetailItem label="회원 ID" value={selectedUnsuspendMember.memberId} />
                <DetailItem label="아이디" value={selectedUnsuspendMember.userid} />
                <DetailItem label="닉네임" value={selectedUnsuspendMember.nickname} />
                <DetailItem
                  label="현재 회원 상태"
                  value={STATUS_LABELS[selectedUnsuspendMember.status] || selectedUnsuspendMember.status}
                />
              </dl>
              <p style={{ margin: "12px 0", fontSize: 14, color: "var(--admin-muted)" }}>
                이 회원을 활동중(ACTIVE) 상태로 복구합니다. 계속하시겠습니까?
              </p>
              <div className="admin-detail-modal-actions">
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={unsuspendSubmitting}
                  onClick={() => setSelectedUnsuspendMember(null)}
                >
                  취소
                </button>
                <button
                  className="admin-detail-secondary-button"
                  type="button"
                  disabled={unsuspendSubmitting}
                  onClick={handleUnsuspendConfirm}
                >
                  {unsuspendSubmitting ? "처리 중" : "복구"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminMembersPage;
