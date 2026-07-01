// 라우터 없이 history API로 페이지 전환 (popstate 이벤트로 라우팅 컴포넌트가 다시 렌더링됨)
export function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// sessionStorage에 저장된 JSON을 안전하게 파싱 (값이 없거나 깨진 경우 fallback 반환)
export function safeParse(key, fallback = null) {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

// 로그인 세션(nailed_session)에서 현재 로그인한 회원의 memberId를 추출
export function getCurrentMemberId() {
  const session = safeParse('nailed_session');
  return session?.memberId ?? null;
}

// 수수료율 (%) — 백엔드 OrderService.DEFAULT_COMMISSION_RATE 와 동일값 유지
export const COMMISSION_RATE = 2;

// 결제 수단 코드 → 화면에 표시할 한글 라벨
export const METHOD_LABELS = {
  card: '신용/체크카드', kakao: '카카오페이',
  naver: '네이버페이', toss: '토스페이',
  phone: '휴대폰 결제', bank: '무통장 입금',
};
