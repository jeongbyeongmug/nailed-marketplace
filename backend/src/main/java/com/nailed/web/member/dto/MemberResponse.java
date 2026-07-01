package com.nailed.web.member.dto;

import java.time.LocalDateTime;
public class MemberResponse {

    public record Home(
            Profile profile,
            long sellingProductCount,
            long soldProductCount,
            long wishlistCount,
            long buyingOrderCount,
            long sellingOrderCount
    ) {}

    public record Profile(
            String memberId,
            String userid,
            String nickname,
            String name,
            String shopInfo,
            String memberStatus,
            String sellerGrade,
            String role,
            String bankCode,
            String accountNumber,
            String depositorName,
            boolean marketingAgreed,
            LocalDateTime createdAt,
            String profileImageUrl
    ) {}

    public record ProductSummary(
            Long productId,
            String title,
            int price,
            String conditionCode,
            String productStatus,
            String orderStatus,
            boolean isSold,
            int viewCount,
            int wishlistCount,
            String thumbnailUrl,
            String size,
            String categoryCode,
            String brandName,
            LocalDateTime createdAt
    ) {}

    public record OrderSummary(
            String orderId,
            Long productId,
            String productTitle,
            String thumbnailUrl,
            String buyerId,
            String sellerId,
            int productPrice,
            int shippingFee,
            int finalPrice,
            String orderStatus,
            String previousStatus,
            String cancelRequestStatus,
            LocalDateTime paidAt,
            LocalDateTime shippedAt,
            LocalDateTime deliveredAt,
            LocalDateTime cancelledAt,
            boolean hasReview
    ) {}

    public record SettlementSummary(
            String orderId,
            Long productId,
            String productTitle,
            String thumbnailUrl,
            int commission,
            int finalPrice,
            int sellerSettlementAmount,
            String orderStatus,
            LocalDateTime paidAt,
            String bankCode,
            String accountNumber,
            String depositorName
    ) {}

    public record AccountInfo(
            String bankCode,
            String accountNumber,
            String depositorName
    ) {}

}
