package com.nailed.web.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AdminProductResponse {

    public record Summary(
            Long productId,
            String title,
            String brandName,
            String categoryName,
            String categoryPath,
            int price,
            String productStatus,
            int viewCount,
            int wishlistCount,
            String sellerId,
            String sellerUserid,
            String sellerNickname,
            String thumbnailUrl,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String deletedReason
    ) {}

    public record Detail(
            Long productId,
            String title,
            String brandName,
            String categoryName,
            String categoryPath,
            int price,
            int shippingFee,
            String shippingMethod,
            String conditionCode,
            String productStatus,
            String size,
            String hashtags,
            String description,
            int viewCount,
            int wishlistCount,
            String sellerId,
            String sellerUserid,
            String sellerNickname,
            List<String> imageUrls,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String deletedReason,
            LocalDateTime deletedAt
    ) {}
}
