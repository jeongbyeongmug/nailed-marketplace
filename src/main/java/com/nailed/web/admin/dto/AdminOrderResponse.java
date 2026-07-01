package com.nailed.web.admin.dto;

import java.time.LocalDateTime;

public class AdminOrderResponse {

    public record Summary(
            String orderId,
            String buyerId,
            String buyerUserid,
            String buyerNickname,
            String sellerId,
            String sellerUserid,
            String sellerNickname,
            Long productId,
            String productTitle,
            String productThumbnailUrl,
            String orderStatus,
            ProductInfo product,
            Integer commission,
            Integer finalPrice,
            Integer sellerSettlementAmount,
            LocalDateTime paidAt,
            LocalDateTime completedAt,
            LocalDateTime updatedAt,
            String previousStatus,
            String cancelRequestReason,
            LocalDateTime requestedAt,
            LocalDateTime shippedAt,
            LocalDateTime cancelledAt
    ) {}

    public record ProductInfo(
            Integer price,
            Integer shippingFee
    ) {}
}
