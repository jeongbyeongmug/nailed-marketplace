import axios from "axios";
import { authRequest } from "./authApi";
import { API_BASE_URL, add503Interceptor } from "./config";

const instance = add503Interceptor(axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
}));

async function request(path, params) {
  try {
    const response = await instance.get(path, { params });
    const data = response.data;
    return data?.data ?? data;
  } catch (error) {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.response?.data ||
      "요청 처리에 실패했습니다.";
    // message만 던지던 기존 방식 → code/status까지 실어 호출부에서 코드 분기 가능하게 함
    const err = new Error(typeof message === "string" ? message : "요청 처리에 실패했습니다.");
    err.code = error.response?.data?.error?.code || null;
    err.status = error.response?.status ?? null;
    throw err;
  }
}

export async function getSellerReviews(memberId, page = 0, size = 10) {
  return request(`/api/users/${encodeURIComponent(memberId)}/reviews`, { page, size });
}

export async function writeReview({ orderId, rating, content }) {
  return authRequest("/api/reviews", {
    method: "POST",
    body: JSON.stringify({
      orderId,
      rating,
      content: content || null,
    }),
  });
}
