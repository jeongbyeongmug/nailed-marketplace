import { authRequest, getValidAccessToken } from "./authApi";

export async function submitInquiry({ category, title, content }) {
  const token = await getValidAccessToken();

  if (!token) {
    throw new Error("로그인이 필요한 서비스입니다.");
  }

  return authRequest("/api/inquiries", {
    method: "POST",
    body: JSON.stringify({
      category,
      title,
      content,
    }),
  });
}

export async function fetchMyInquiries(page = 0, size = 10) {
  return authRequest(`/api/inquiries/my?page=${page}&size=${size}`);
}

export async function fetchMyInquiryDetail(inquiryId) {
  return authRequest(`/api/inquiries/my/${encodeURIComponent(inquiryId)}`);
}

export async function fetchAdminInquiries({ status = "", page = 0, size = 10, sort = "" } = {}) {
  const params = new URLSearchParams({ page, size });

  if (status) {
    params.set("status", status);
  }
  if (sort) {
    params.set("sort", sort);
  }

  return authRequest(`/api/admin/inquiries?${params.toString()}`);
}

export async function fetchAdminInquiryDetail(inquiryId) {
  return authRequest(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}`);
}

export async function answerAdminInquiry(inquiryId, answerContent) {
  return authRequest(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}/answer`, {
    method: "PATCH",
    body: JSON.stringify({ answerContent }),
  });
}
