// src/api/orderApi.js

import { authRequest } from "./authApi";

const BASE = '/api/orders';

const req = (path, options = {}) => authRequest(path, options);

export const createOrder       = (buyerId, sellerId, body) =>
  req(`${BASE}?buyerId=${buyerId}&sellerId=${sellerId}`, { method: 'POST', body: JSON.stringify(body) });

export const getOrder          = (orderId) => req(`${BASE}/${orderId}`);

export const registerTracking  = (orderId, body) =>
  req(`${BASE}/${orderId}/shipping`, { method: 'PATCH', body: JSON.stringify(body) });

export const confirmDelivery   = (orderId) =>
  req(`${BASE}/${orderId}/delivered`, { method: 'PATCH' });

export const mockPay           = (orderId) =>
  req(`${BASE}/${orderId}/pay`, { method: 'PATCH' });
export const cancelOrder = (orderId, buyerId) =>
  req(`${BASE}/${orderId}/cancel?buyerId=${buyerId}`, { method: 'POST' });