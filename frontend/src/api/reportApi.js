import { authRequest } from "./authApi";

export const REPORT_REASONS = [
  { code: "FRAUD", label: "사기" },
  { code: "MISLEADING_INFO", label: "상품 정보 허위/불일치" },
  { code: "PROHIBITED_ITEM", label: "금지상품" },
  { code: "ETC", label: "기타" },
];

async function requestWithAuth(path, options = {}) {
  return authRequest(path, options);
}

export async function submitReport({ targetMemberId, reasonCode, detail }) {
  return requestWithAuth("/api/reports", {
    method: "POST",
    body: JSON.stringify({
      targetMemberId,
      reasonCode,
      detail: detail || null,
    }),
  });
}

export async function fetchMyReports(page = 0, size = 10) {
  return requestWithAuth(`/api/reports/me?page=${page}&size=${size}`);
}