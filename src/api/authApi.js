import axios from "axios";
import { API_BASE_URL, add503Interceptor } from "./config";

/**
 * authApi.js — 로그인·회원가입·토큰 관리
 *
 * 토큰 저장 위치
 *   Access Token  → sessionStorage (탭 닫으면 삭제, JS 접근 가능)
 *   Refresh Token → HttpOnly 쿠키  (JS 접근 불가 → XSS 방어, BE가 직접 심어줌)
 */

// 스토리지 키 상수
const ACCESS_TOKEN_KEY     = "accessToken";
const TOKEN_EXPIRES_AT_KEY = "tokenExpiresAt";
const SESSION_KEY          = "nailed_session"; // 로그인 회원 정보 (memberId, role 등)

const AUTH_STORAGE_KEYS = [ACCESS_TOKEN_KEY, TOKEN_EXPIRES_AT_KEY, SESSION_KEY];

// 과거에 사용했다 폐기된 키 (브라우저에 남아있을 수 있어 로그인 시 함께 삭제)
const LEGACY_AUTH_KEYS = [
  ...AUTH_STORAGE_KEYS,
  "userid", "nickname", "role", "memberStatus", "refreshToken",
  "nailed_access_token", "nailed_refresh_token", "nailed_token_type",
  "nailed_token_expires_at", "nailed_userid", "nailed_nickname",
  "nailed_role", "nailed_member_status", "nailedAccessToken", "nailedRefreshToken",
];

const UNUSED_SESSION_AUTH_KEYS = [
  "userid", "nickname", "role", "memberStatus",
  "nailed_access_token", "nailed_refresh_token", "nailed_token_type",
  "nailed_token_expires_at", "nailed_userid", "nailed_nickname",
  "nailed_role", "nailed_member_status", "nailedAccessToken", "nailedRefreshToken",
];

const SESSION_EXPIRED_MESSAGE = "로그인 시간이 만료되었습니다. 다시 로그인해주세요.";

// 여러 요청이 동시에 401 실패할 때 alert가 중복으로 뜨는 것을 방지하는 플래그
let sessionExpiredNotified = false;

// ── axios 인스턴스 ─────────────────────────────────────────────────
// withCredentials: true → refreshToken HttpOnly 쿠키가 요청에 자동 포함됨
// BE의 CORS allowCredentials(true) 와 반드시 쌍으로 설정해야 동작
const instance = add503Interceptor(axios.create({ baseURL: API_BASE_URL, withCredentials: true }));

// ── 응답 데이터 추출 ───────────────────────────────────────────────
// BE 응답 구조: { success: true, data: { ... } } → data 필드만 꺼냄
function extractData(response) {
  const data = response.data;
  return data?.data ?? data;
}

// ── 에러 메시지 추출 ───────────────────────────────────────────────
function extractErrorMessage(error, fallback) {
  const message =
    error.response?.data?.error?.message ||
    error.response?.data?.message ||
    error.response?.data ||
    fallback;
  return typeof message === "string" ? message : fallback;
}

// BE 에러 코드(예: M015) 추출 — 응답 구조 { error: { code, message } }
function extractErrorCode(error) {
  return error.response?.data?.error?.code || null;
}

// 메시지만 담던 기존 throw를 대체 — code/status까지 실어 호출부에서 분기 가능하게 함
// (기존 호출부는 err.message만 쓰므로 하위호환 유지)
function buildApiError(error, fallback) {
  const err = new Error(extractErrorMessage(error, fallback));
  err.code = extractErrorCode(error);
  err.status = error.response?.status ?? null;
  return err;
}

// ── 비로그인 공통 요청 ─────────────────────────────────────────────
// 로그인·회원가입 등 Authorization 헤더 없이 호출하는 요청
async function request(path, options = {}) {
  try {
    const response = await instance({
      url: path,
      method: options.method || "GET",
      data: options.body ? JSON.parse(options.body) : undefined,
      params: options.params,
      headers: options.headers || {},
    });
    return extractData(response);
  } catch (error) {
    throw buildApiError(error, "요청 처리에 실패했습니다.");
  }
}

// ── 세션 관리 ──────────────────────────────────────────────────────

function normalizeUserId(userId) { return userId.trim(); }

/** 로그인 회원 정보를 sessionStorage에 저장 (Header 컴포넌트 등에서 빠르게 조회용) */
function saveSession(user) {
  const session = {
    memberId: user.memberId,
    userid: user.userid,
    nickname: user.nickname,
    role: user.role || "USER",
    memberStatus: user.memberStatus || user.member_status || "ACTIVE",
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearLegacyAuthLocalStorage() {
  LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

/** Access Token과 만료 시각을 sessionStorage에 저장 (refreshToken은 쿠키로 관리) */
function saveAuthFields(data) {
  clearLegacyAuthLocalStorage();
  UNUSED_SESSION_AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key));
  sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  if (data.tokenExpiresAt) sessionStorage.setItem(TOKEN_EXPIRES_AT_KEY, data.tokenExpiresAt);
}

/** 로그인 응답 저장 후 storage 이벤트 발생 → Header 등 로그인 상태 감지 컴포넌트에 알림 */
function saveLoginResult(data) {
  if (!data?.accessToken) throw new Error("로그인 응답에 accessToken이 없습니다.");

  sessionExpiredNotified = false;
  saveAuthFields(data);

  const hasMemberInfo = data.memberId || data.userid || data.nickname || data.name || data.role;
  const session = hasMemberInfo ? saveSession(data) : null;

  window.dispatchEvent(new Event("storage"));
  return session || data;
}

// ── 토큰 조회 ──────────────────────────────────────────────────────

function getAccessToken()    { return sessionStorage.getItem(ACCESS_TOKEN_KEY);     }
function getTokenExpiresAt() { return sessionStorage.getItem(TOKEN_EXPIRES_AT_KEY); }

/**
 * Access Token 만료 여부 확인 (만료 10초 전부터 만료로 처리)
 * 만료 시각 형식이 버전마다 달라 3가지로 처리
 *   - 초 단위 Unix timestamp (10자리) → ms로 변환
 *   - ms 단위 Unix timestamp (13자리) → 그대로 사용
 *   - ISO 문자열 → Date.parse()로 변환
 */
function isAccessTokenExpired() {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return false;

  const num = Number(expiresAt);
  const expiresAtMs = Number.isFinite(num)
    ? num < 1_000_000_000_000 ? num * 1000 : num
    : Date.parse(expiresAt);

  if (!Number.isFinite(expiresAtMs)) return false;
  return Date.now() >= expiresAtMs - 10_000; // 10초 여유
}

export function getAuthorizationHeader(token) { return `Bearer ${token}`; }

// ── 세션 만료 처리 ─────────────────────────────────────────────────

/** 세션 만료 알림 후 로그인 페이지로 이동 (중복 alert 방지) */
function redirectToLoginWithMessage() {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  window.alert(SESSION_EXPIRED_MESSAGE);
  if (window.location.pathname !== "/login") {
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

/** 인증 관련 스토리지 전체 삭제 + 필요 시 로그인 페이지로 이동 */
export function clearAuthStorage({ redirect = false } = {}) {
  AUTH_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
  UNUSED_SESSION_AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key));
  clearLegacyAuthLocalStorage();
  window.dispatchEvent(new Event("storage"));
  if (redirect) redirectToLoginWithMessage();
}

// ── Access Token 재발급 ────────────────────────────────────────────

/** refreshToken HttpOnly 쿠키로 새 Access Token 발급 (자동 전송, 별도 설정 불필요) */
async function refreshAccessToken() {
  try {
    const response = await instance.post("/api/auth/refresh");
    const result = extractData(response);
    if (!result?.accessToken) throw new Error(SESSION_EXPIRED_MESSAGE);

    saveAuthFields(result);
    if (result.memberId || result.userid || result.nickname || result.role || result.memberStatus)
      saveSession(result);
    window.dispatchEvent(new Event("storage"));

    return result.accessToken;
  } catch (error) {
    throw new Error(extractErrorMessage(error, SESSION_EXPIRED_MESSAGE));
  }
}

/**
 * 유효한 Access Token 반환
 *   1) 토큰 있고 만료 안 됨 → 그대로 반환
 *   2) 없거나 만료 → refreshToken으로 재발급
 *   3) 재발급 실패 → redirectOnFailure=true면 로그인 페이지로 이동, false면 null 반환
 */
export async function getValidAccessToken({ forceRefresh = false, redirectOnFailure = false } = {}) {
  const token = getAccessToken();
  if (token && !forceRefresh && !isAccessTokenExpired()) return token;

  try {
    return await refreshAccessToken();
  } catch (error) {
    if (redirectOnFailure) {
      clearAuthStorage({ redirect: true });
      throw new Error(error.message || SESSION_EXPIRED_MESSAGE);
    }
    return null;
  }
}

// 로그인·재발급 경로에서 401 뜨면 재시도해도 의미 없으므로 제외
function isAuthPath(path) {
  return path === "/api/auth/login" || path === "/api/auth/refresh";
}

// ── 인증 필요 요청 ─────────────────────────────────────────────────
/**
 * Authorization 헤더 자동 추가 + 401 시 토큰 재발급 후 1회 재시도
 * retried=true: 재시도 중임을 표시해 무한 루프 방지
 */
export async function authRequest(path, options = {}, retried = false) {
  const token = await getValidAccessToken({ redirectOnFailure: true });
  if (!token) {
    clearAuthStorage({ redirect: true });
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  const { Authorization, authorization, ...optionHeaders } = options.headers || {};

  try {
    const response = await instance({
      url: path,
      method: options.method || "GET",
      // FormData(파일 업로드)는 JSON.parse 하면 안 됨
      data: options.body && !(options.body instanceof FormData) ? JSON.parse(options.body) : options.body,
      params: options.params,
      headers: { ...optionHeaders, Authorization: getAuthorizationHeader(token) },
    });
    if (response.status === 204) return null;
    return extractData(response);

  } catch (error) {
    const status = error.response?.status;

    // 401 첫 번째 실패 → 재발급 후 재시도
    if (status === 401 && !retried && !isAuthPath(path)) {
      try {
        const newToken = await refreshAccessToken();
        return authRequest(
          path,
          { ...options, headers: { ...optionHeaders, Authorization: getAuthorizationHeader(newToken) } },
          true,
        );
      } catch (refreshError) {
        clearAuthStorage({ redirect: true });
        throw new Error(refreshError.message || SESSION_EXPIRED_MESSAGE);
      }
    }

    if (status === 401 || status === 403) {
      clearAuthStorage({ redirect: true });
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    throw buildApiError(error, "요청 처리에 실패했습니다.");
  }
}

// ── API 함수 ───────────────────────────────────────────────────────

/** 아이디 중복 확인 — BE 응답 { duplicated } → { available } 로 변환 */
export async function checkUserId(userId) {
  const data = await request("/api/auth/check-userid", { params: { userid: normalizeUserId(userId) } });
  return { available: !data.duplicated };
}

/** 닉네임 중복 확인 */
export async function checkNickname(nickname) {
  const data = await request("/api/auth/check-nickname", { params: { nickname: nickname.trim() } });
  return { available: !data.duplicated };
}

/** 회원가입 */
export async function signUp({ name, userId, nickname, password, serviceTermsAgreed, privacyPolicyAgreed, marketingAgreed }) {
  return request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim(), userid: normalizeUserId(userId), nickname: nickname.trim(),
      password, serviceTermsAgreed, privacyPolicyAgreed, marketingAgreed,
    }),
  });
}

/** 로그인 — 성공 시 Access Token을 sessionStorage에, Refresh Token을 쿠키에 저장 */
export async function login({ userId, password }) {
  try {
    const response = await instance.post("/api/auth/login", {
      userid: normalizeUserId(userId), password,
    });
    return saveLoginResult(extractData(response));
  } catch (error) {
    throw buildApiError(error, "로그인에 실패했습니다.");
  }
}

/** 임시 비밀번호 발급 (운영 시 이메일 발송 필요, 현재는 응답으로 직접 반환) */
export async function findPassword({ userId }) {
  const data = await request("/api/auth/password/reset-request", {
    method: "POST",
    body: JSON.stringify({ userid: normalizeUserId(userId) }),
  });
  return {
    temporaryPassword:
      data?.temporaryPassword ?? data?.data?.temporaryPassword ?? data?.data?.data?.temporaryPassword ?? "",
  };
}

/** 로그아웃 — BE에서 DB 토큰 삭제 + 쿠키 만료, finally로 세션 항상 정리 */
export async function logout() {
  try { await instance.post("/api/auth/logout"); }
  finally { clearAuthStorage(); }
}
