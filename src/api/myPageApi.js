import { authRequest } from "./authApi";

/**
 * myPageApi.js — 마이페이지 API 모음
 * 모든 요청은 authRequest()를 통해 Authorization 헤더 자동 추가 + 토큰 만료 시 자동 재발급
 */

const SESSION_KEY          = "nailed_session";
const RECENTLY_VIEWED_KEY  = "nailed_recently_viewed"; // 최근 본 상품 (localStorage)

// ── 세션 유틸 ──────────────────────────────────────────────────────

/** sessionStorage에서 로그인 세션 읽기 — 파싱 실패 시 null 반환 */
function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

/** 현재 로그인 회원의 memberId 반환 — 키 이름 변경 이력 있어 여러 키 순서대로 확인 */
function getMemberId() {
  const session = readSession();
  return session?.member_id || session?.memberId || session?.id || null;
}

/** authRequest 래퍼 — 추후 공통 처리(로딩, 에러 로깅 등) 추가 용이 */
async function request(path, options = {}) {
  return authRequest(path, options);
}

// ── 공개 유틸 ──────────────────────────────────────────────────────

export function getCurrentMemberId() { return getMemberId(); }

// ── 프로필 ─────────────────────────────────────────────────────────

/** 내 프로필 조회 (닉네임, 판매자 등급, 계좌 정보 등) */
export async function fetchMyProfile() {
  const data = await request("/api/members/mypage/profile");
  return data?.data ?? data;
}

/** 프로필 수정 (닉네임, 샵 소개, 프로필 이미지 URL 등) */
export async function updateMyProfile(payload) {
  return request("/api/members/mypage/profile", { method: "PUT", body: JSON.stringify(payload) });
}

/**
 * 프로필 이미지 업로드
 * 이미지 파일은 JSON 불가 → FormData로 multipart/form-data 전송
 * axios가 FormData 감지 시 Content-Type 자동 설정
 */
export async function uploadMyProfileImage(file) {
  const formData = new FormData();
  formData.append("file", file); // "file" = BE의 @RequestParam("file") 명과 일치
  return authRequest("/api/members/mypage/profile/image", { method: "POST", body: formData });
}

/** 프로필 이미지 삭제 — DB를 NULL로, 이후 기본 이미지로 표시 */
export async function deleteProfileImage() {
  return request("/api/members/mypage/profile/image", { method: "DELETE" });
}

// ── 상품 ───────────────────────────────────────────────────────────

/** 내 판매 상품 목록 — page: 0부터 시작 (Spring Pageable 기준) */
export async function fetchMyProducts(page = 0, size = 15) {
  return request(`/api/members/mypage/products?page=${page}&size=${size}`);
}

/** 상품 상태 변경 (판매중 → 예약중 등) */
export async function updateMyProductStatus(productId, payload) {
  return request(`/api/products/${encodeURIComponent(productId)}/status`, {
    method: "PATCH", body: JSON.stringify(payload),
  });
}

/** 상품 삭제 — 실제 삭제 아닌 product_status='DELETED' 소프트 삭제 (거래 내역 보존) */
export async function deleteMyProduct(productId) {
  return request(`/api/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

// ── 찜 목록 ────────────────────────────────────────────────────────

export async function fetchWishlist(page = 0, size = 15) {
  return request(`/api/members/mypage/wishlist?page=${page}&size=${size}`);
}

export async function deleteWishlist(productId) {
  return request(`/api/products/${encodeURIComponent(productId)}/wishlist`, { method: "DELETE" });
}

// ── 주문 내역 ──────────────────────────────────────────────────────

/**
 * 주문 내역 조회
 * type: "BUY" → buyer_id 기준 (내가 구매), "SELL" → seller_id 기준 (내가 판매)
 */
export async function fetchOrders(page = 0, size = 15, type = "BUY") {
  return request(`/api/members/mypage/orders?type=${type}&page=${page}&size=${size}`);
}

// ── 정산 ───────────────────────────────────────────────────────────

/** 정산 내역 조회 (SHIPPING·DELIVERED 상태 주문의 수수료·정산 금액 포함) */
export async function fetchSettlements(page = 0, size = 20) {
  return request(`/api/members/mypage/settlements?page=${page}&size=${size}`);
}

/** 정산 계좌 정보 조회 (은행코드, 계좌번호, 예금주명) */
export async function fetchAccountInfo() {
  const data = await request("/api/members/mypage/account-info");
  return data?.data ?? data;
}

/**
 * 정산 계좌 수정
 * 예금주명은 BE에서 회원 실명으로 자동 설정 → 금융 사고 방지를 위해 FE에서 임의 변경 불가
 */
export async function updateAccountInfo(payload) {
  return request("/api/members/mypage/account-info", { method: "PUT", body: JSON.stringify(payload) });
}

// ── 회원 탈퇴 ──────────────────────────────────────────────────────

/**
 * 회원 탈퇴 — 소프트 삭제 (member_status='WITHDRAWN')
 * 거래·리뷰 등 연관 데이터 보존을 위해 실제 삭제 안 함
 * 탈퇴 후 컴포넌트에서 clearAuthStorage() 호출 필요
 */
export async function withdrawMe() {
  return request("/api/members/mypage", { method: "DELETE" });
}

// ── 최근 본 상품 ───────────────────────────────────────────────────

/**
 * 최근 본 상품 조회 (서버 통신 없음, localStorage만 사용)
 * localStorage 사용 이유: 브라우저를 닫아도 유지되어야 하므로 sessionStorage 대신 사용
 */
export function fetchRecentlyViewed() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
    return Array.isArray(value) ? value.slice(0, 10) : [];
  } catch {
    return []; // 파싱 실패 시 빈 배열 반환
  }
}
