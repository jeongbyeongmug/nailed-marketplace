import axios from "axios";
import { authRequest, getAuthorizationHeader, getValidAccessToken } from "./authApi";
import { API_BASE_URL, add503Interceptor } from "./config";

const instance = add503Interceptor(axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
}));

async function request(path, options = {}) {
  const { body, headers, method = "GET", ...restOptions } = options;

  try {
    const response = await instance({
      url: path,
      method,
      data: body,
      headers: {
        ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...restOptions,
    });

    const data = response.data;
    return data?.data ?? data;
  } catch (axiosError) {
    const data = axiosError.response?.data;
    const message = typeof data === "string" ? data : data?.error?.message || data?.message || "요청 처리에 실패했습니다.";
    const error = new Error(message);
    error.code = (typeof data === "object" && data?.error?.code) || null;
    error.status = axiosError.response?.status;
    throw error;
  }
}

async function requestWithAuth(path, options = {}) {
  return authRequest(path, options);
}

function appendProductFilters(params, filters = {}) {
  const hasValue = (value) => value !== undefined && value !== null && value !== "";

  if (hasValue(filters.minPrice)) params.append("minPrice", filters.minPrice);
  if (hasValue(filters.maxPrice)) params.append("maxPrice", filters.maxPrice);
  if (filters.gender) params.append("gender", filters.gender);
  if (filters.excludeSold === true) params.append("excludeSold", "true");
  if (filters.productSize) params.append("productSize", filters.productSize);
  if (filters.conditionCode) params.append("conditionCode", filters.conditionCode);
  if (filters.sortBy || filters.sort) params.append("sortBy", filters.sortBy ?? filters.sort);
}

export async function getProductList(categoryId, page = 0, size = 15, filters = {}) {
  const params = new URLSearchParams({ categoryId, page, size });
  appendProductFilters(params, filters);
  return request(`/api/products?${params.toString()}`);
}

export async function getBrands() {
  return request("/api/products/brands");
}

export async function getProductCategories() {
  return request("/api/products/categories");
}

export async function getConditions() {
  return request("/api/products/conditions");
}

export async function getSizes() {
  return request("/api/products/sizes");
}

export async function getProductListByCode(categoryCode, page = 0, size = 20, filters = {}) {
  const params = new URLSearchParams({ categoryCode, page, size });
  appendProductFilters(params, filters);
  return request(`/api/products?${params.toString()}`);
}

export async function getNewProducts() {
  return request("/api/products/new");
}

export async function getPopularProducts() {
  return request("/api/products/popular");
}

export async function searchProducts({
  categoryId,
  keyword,
  minPrice,
  maxPrice,
  conditionCode,
  productSize,
  gender,
  excludeSold,
  sort,
  sortBy = "latest",
  page = 0,
  size = 15,
} = {}) {
  const params = new URLSearchParams();
  const hasValue = (value) => value !== undefined && value !== null && value !== "";

  if (categoryId !== undefined && categoryId !== null) params.append("categoryId", categoryId);
  if (keyword) params.append("keyword", keyword);
  if (hasValue(minPrice)) params.append("minPrice", minPrice);
  if (hasValue(maxPrice)) params.append("maxPrice", maxPrice);
  if (conditionCode) params.append("conditionCode", conditionCode);
  if (productSize) params.append("productSize", productSize);
  if (gender) params.append("gender", gender);
  if (excludeSold === true) params.append("excludeSold", "true");
  params.append("sort", sort ?? sortBy);
  params.append("page", page);
  params.append("size", size);
  return request(`/api/products/search?${params.toString()}`);
}

function removeAuthorizationHeader(headers = {}) {
  const { Authorization, authorization, ...rest } = headers;
  return rest;
}

async function getOptionalAuthHeaders({ forceRefresh = false } = {}) {
  const token = await getValidAccessToken({ forceRefresh });
  if (!token) return {};
  return { Authorization: getAuthorizationHeader(token) };
}

async function requestWithOptionalAuth(path, options = {}) {
  const baseHeaders = removeAuthorizationHeader(options.headers);
  const authHeaders = await getOptionalAuthHeaders();
  const hasAuthHeader = Boolean(authHeaders.Authorization);

  try {
    return await request(path, {
      ...options,
      headers: {
        ...baseHeaders,
        ...authHeaders,
      },
    });
  } catch (error) {
    if (error.status !== 401 || !hasAuthHeader) {
      throw error;
    }

    const refreshedHeaders = await getOptionalAuthHeaders({ forceRefresh: true });
    if (refreshedHeaders.Authorization) {
      try {
        return await request(path, {
          ...options,
          headers: {
            ...baseHeaders,
            ...refreshedHeaders,
          },
        });
      } catch (retryError) {
        if (retryError.status !== 401) {
          throw retryError;
        }
      }
    }

    return request(path, {
      ...options,
      headers: baseHeaders,
    });
  }
}

function toAssetUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function getProductDetail(productId) {
  const data = await requestWithOptionalAuth(`/api/products/${encodeURIComponent(productId)}`);
  if (data && Array.isArray(data.imageUrls)) {
    data.imageUrls = data.imageUrls.map(toAssetUrl);
  }
  if (data?.seller?.profileImageUrl) {
    data.seller.profileImageUrl = toAssetUrl(data.seller.profileImageUrl);
  }
  if (data && data.shippingFee == null && data.shipping_fee != null) {
    data.shippingFee = data.shipping_fee;
  }
  return data;
}

export async function incrementViewCount(productId) {
  return request(`/api/products/${encodeURIComponent(productId)}/view`, { method: "POST" });
}

export async function getUserHome(memberId) {
  return request(`/api/users/${encodeURIComponent(memberId)}`);
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  return requestWithAuth("/api/products/image-upload", {
    method: "POST",
    body: formData,
  });
}

export async function registerProduct(body) {
  return requestWithAuth("/api/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateProduct(productId, body) {
  return requestWithAuth(`/api/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteProduct(productId, reason) {
  const params = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return requestWithAuth(`/api/products/${encodeURIComponent(productId)}${params}`, {
    method: "DELETE",
  });
}

export function getProducts() {
  return [];
}

export async function addWishlist(productId) {
  return requestWithAuth(`/api/products/${encodeURIComponent(productId)}/wishlist`, {
    method: "POST",
  });
}

export async function removeWishlist(productId) {
  return requestWithAuth(`/api/products/${encodeURIComponent(productId)}/wishlist`, {
    method: "DELETE",
  });
}

export async function getRandomProducts(size = 10) {
  const data = await request(`/api/products/random?size=${size}`);
  return fixSummaryImages(data);
}

export function fixSummaryImages(list) {
  if (!Array.isArray(list)) return list;
  return list.map((p) => ({
    ...p,
    thumbnailUrl: toAssetUrl(p.thumbnailUrl),
  }));
}

export async function getSellerProducts(sellerId, excludeId) {
  const params = new URLSearchParams();
  if (excludeId != null) params.append("exclude", excludeId);
  const qs = params.toString();
  const data = await request(
    `/api/products/seller/${encodeURIComponent(sellerId)}${qs ? `?${qs}` : ""}`
  );
  return fixSummaryImages(data);
}

export async function getRelatedProducts(productId, size = 5) {
  const data = await request(
    `/api/products/${encodeURIComponent(productId)}/related?size=${size}`
  );
  return fixSummaryImages(data);
}
