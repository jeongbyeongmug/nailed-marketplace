// src/api/orderApi.js
// 주문 API — 모든 요청은 JWT 인증(authRequest) 필수.
// 요청자(구매자/판매자)는 서버가 토큰에서 식별하므로 buyerId/sellerId를 보내지 않는다.

import { authRequest } from "./authApi";

const BASE = '/api/orders';

const req = (path, options = {}) => authRequest(path, options);

export const createOrder       = (body) =>
  req(BASE, { method: 'POST', body: JSON.stringify(body) });

export const getOrder          = (orderId) => req(`${BASE}/${orderId}`);

export const registerTracking  = (orderId, body) =>
  req(`${BASE}/${orderId}/shipping`, { method: 'PATCH', body: JSON.stringify(body) });

export const confirmDelivery   = (orderId) =>
  req(`${BASE}/${orderId}/delivered`, { method: 'PATCH' });

// expectedAmount: 화면에 표시된 결제 금액 — 서버 저장액과 다르면 O007로 차단됨
export const mockPay           = (orderId, expectedAmount) =>
  req(`${BASE}/${orderId}/pay`, {
    method: 'PATCH',
    body: JSON.stringify(expectedAmount != null ? { expectedAmount } : {}),
  });

export const confirmOrder      = (orderId) =>
  req(`${BASE}/${orderId}/confirm`, { method: 'PATCH' });

export const cancelOrder       = (orderId) =>
  req(`${BASE}/${orderId}/cancel`, { method: 'POST' });
