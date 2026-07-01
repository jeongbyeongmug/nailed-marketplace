package com.nailed.web.product.dto;

import com.nailed.web.product.entity.Product;

import java.time.LocalDateTime;
import java.util.List;

public class ProductResponse {

    /** 상품 목록 카드 (썸네일·상품명·가격·상태등급·찜수) */
    public record Summary(
            Long productId,
            String title,
            int price,
            int shippingFee,
            String conditionCode,       // S / A / B / C / D
            String conditionLabel,      // 새제품 / 거의새것 / 상태좋음 ...
            int wishlistCount,
            String thumbnailUrl,        // sort_order=0 이미지 URL (null 가능)
            String productStatus,       // ON_SALE / SOLD (목록에서 DELETED 제외)
            LocalDateTime createdAt,
            String brandCode,           // BRAND_NIKE / LUXURY_GUCCI 등 (브랜드 없으면 null)
            String brandName,           // DB 표시명 (null 가능)
            String categoryCode,
            String size                 // 사이즈 (null 가능)
    ) {
        public static Summary from(Product product, String thumbnailUrl) {
            return new Summary(
                    product.getProductId(),
                    product.getTitle(),
                    product.getPrice(),
                    product.getShippingFee(),
                    product.getConditionCode().name(),
                    product.getConditionCode().getLabel(),
                    product.getWishlistCount(),
                    thumbnailUrl,
                    product.getProductStatus().name(),
                    product.getCreatedAt(),
                    product.getBrand() != null ? product.getBrand().getCode() : null,
                    product.getBrand() != null ? product.getBrand().getName() : null,
                    product.getCategory() != null ? product.getCategory().getCode() : null,
                    product.getSize()
            );
        }
    }

    /** 상세 페이지 하단 판매자 프로필 카드 */
    public record SellerInfo(
            String memberId,
            String nickname,
            String sellerGrade,         // BRONZE / SILVER / GOLD / DIAMOND
            long reviewCount,           // 리뷰 건수
            Double averageRating,       // 평균 평점 (리뷰 없으면 null)
            String profileImageUrl
    ) {}

    /** 상세 페이지 전체 데이터 */
    public record Detail(
            Long productId,
            String title,
            int price,
            int shippingFee,
            String conditionCode,
            String conditionLabel,
            String conditionDescription,
            String categoryName,
            String categoryCode,        // product_groups.code (예: MENS_TOP_TSHIRT)
            String categoryPath,        // 맨즈웨어 > 상의 > 티셔츠
            String brandName,           // 브랜드 없으면 null
            String size,
            String shippingMethod,
            int viewCount,
            int wishlistCount,
            String productStatus,
            String description,
            String hashtags,
            LocalDateTime createdAt,
            List<String> imageUrls,     // sort_order 오름차순
            SellerInfo seller,
            boolean isWishlisted        // 현재 로그인 유저의 찜 여부 (비로그인 false)
    ) {
        public static Detail from(Product product, List<String> imageUrls, SellerInfo seller, String categoryPath, boolean isWishlisted) {
            return new Detail(
                    product.getProductId(),
                    product.getTitle(),
                    product.getPrice(),
                    product.getShippingFee(),
                    product.getConditionCode().name(),
                    product.getConditionCode().getLabel(),
                    product.getConditionCode().getDescription(),
                    product.getCategory().getName(),
                    product.getCategory().getCode(),
                    categoryPath,
                    product.getBrand() != null ? product.getBrand().getName() : null,
                    product.getSize(),
                    product.getShippingMethod(),
                    product.getViewCount(),
                    product.getWishlistCount(),
                    product.getProductStatus().name(),
                    product.getDescription(),
                    product.getHashtags(),
                    product.getCreatedAt(),
                    imageUrls,
                    seller,
                    isWishlisted
            );
        }
    }
}
