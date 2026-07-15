package com.nailed.web.order.service;

import com.nailed.web.order.dto.OrderResponseDto;

public interface ShippingService {

    // 운송장 등록 — 주문의 판매자 본인만 가능
    OrderResponseDto registerTracking(String orderId, String sellerId, String carrierCode, String trackingNumber);

    // 배송 완료(수취 확인) — 주문의 구매자 본인만 가능
    OrderResponseDto confirmDelivery(String orderId, String buyerId);
}
