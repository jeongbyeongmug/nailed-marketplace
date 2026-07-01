package com.nailed.web.order.service;

import com.nailed.web.order.dto.OrderResponseDto;

public interface ShippingService {

    OrderResponseDto registerTracking(String orderId, String carrierCode, String trackingNumber);

    OrderResponseDto confirmDelivery(String orderId);
}
