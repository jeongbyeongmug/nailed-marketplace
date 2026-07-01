import { authRequest } from "./authApi";

export async function fetchAdminMembers({
  page = 0,
  size = 10,
  keyword = "",
  role = "",
  status = "",
  sellerGrade = "",
  sort = "",
} = {}) {
  const params = new URLSearchParams({
    page,
    size,
  });

  if (keyword) params.set("keyword", keyword);
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (sellerGrade) params.set("sellerGrade", sellerGrade);
  if (sort) params.set("sort", sort);

  return authRequest(`/api/admin/members?${params.toString()}`);
}

export async function getAdminMember(memberId) {
  return authRequest(`/api/admin/members/${encodeURIComponent(memberId)}`);
}

export async function createAdminMemberPenalty(memberId, payload) {
  return authRequest(`/api/admin/members/${encodeURIComponent(memberId)}/penalties`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminMemberPenalties(memberId) {
  return authRequest(`/api/admin/members/${encodeURIComponent(memberId)}/penalties`);
}

export async function getAdminProducts({
  page = 0,
  size = 10,
  keyword = "",
  productStatus = "",
  categoryId = "",
  categoryCode = "",
  brandCode = "",
  brandName = "",
  sellerKeyword = "",
  sort = "",
} = {}) {
  const params = new URLSearchParams({
    page,
    size,
  });

  if (keyword) params.set("keyword", keyword);
  if (productStatus) params.set("productStatus", productStatus);
  if (categoryId) params.set("categoryId", categoryId);
  if (categoryCode) params.set("categoryCode", categoryCode);
  if (brandCode) params.set("brandCode", brandCode);
  if (brandName) params.set("brandName", brandName);
  if (sellerKeyword) params.set("sellerKeyword", sellerKeyword);
  if (sort) params.set("sort", sort);

  return authRequest(`/api/admin/products?${params.toString()}`);
}

export async function getAdminProduct(productId) {
  return authRequest(`/api/admin/products/${encodeURIComponent(productId)}`);
}

export async function deleteAdminProduct(productId, reason) {
  return authRequest(`/api/admin/products/${encodeURIComponent(productId)}/delete`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function restoreAdminProduct(productId) {
  return authRequest(`/api/admin/products/${encodeURIComponent(productId)}/restore`, {
    method: "PATCH",
  });
}

export async function unsuspendAdminMember(memberId) {
  return authRequest(`/api/admin/members/${encodeURIComponent(memberId)}/unsuspend`, {
    method: "PATCH",
  });
}

export async function getAdminOrders({
  page = 0,
  size = 10,
  keyword = "",
  orderStatus = "",
  dateFrom = "",
  dateTo = "",
  sort = "",
} = {}) {
  const params = new URLSearchParams({
    page,
    size,
  });

  if (keyword) params.set("keyword", keyword);
  if (orderStatus) params.set("orderStatus", orderStatus);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (sort) params.set("sort", sort);

  return authRequest(`/api/admin/orders?${params.toString()}`);
}

export async function cancelAdminOrder(orderId, reason) {
  return authRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function getAdminReports({
  page = 0,
  size = 10,
  keyword = "",
  targetType = "",
  reasonCode = "",
  status = "",
  dateFrom = "",
  dateTo = "",
  sort = "",
} = {}) {
  const params = new URLSearchParams({
    page,
    size,
  });

  if (keyword) params.set("keyword", keyword);
  if (targetType) params.set("targetType", targetType);
  if (reasonCode) params.set("reasonCode", reasonCode);
  if (status) params.set("status", status);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (sort) params.set("sort", sort);

  return authRequest(`/api/admin/reports?${params.toString()}`);
}

export async function rejectAdminReport(reportId, reason) {
  return authRequest(`/api/admin/reports/${encodeURIComponent(reportId)}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function penalizeAdminReport(reportId, payload) {
  return authRequest(`/api/admin/reports/${encodeURIComponent(reportId)}/penalize`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminDashboard() {
  return authRequest("/api/admin/dashboard");
}

export async function getDashboardTrends({ period = "DAILY", range } = {}) {
  const params = new URLSearchParams({
    period,
    range: range ?? (period === "MONTHLY" ? 12 : 30),
  });

  return authRequest(`/api/admin/dashboard/trends?${params.toString()}`);
}
