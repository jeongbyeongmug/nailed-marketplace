package com.nailed.web.review.dto;

import com.nailed.common.response.PageResponse;
import java.time.LocalDateTime;

public class ReviewResponse {

    /** 리뷰 단건 상세 */
    public record Detail(
            Long reviewId,
            String orderId,
            String buyerNickname,   // 작성자 닉네임
            int rating,
            String content,
            LocalDateTime createdAt,
            String productTitle,    // 상품명
            String productImageUrl, // 상품 대표 이미지
            Integer price           // 상품 가격 (상품 조회 불가 시 null)
    ) {}

    /** 판매자 리뷰 목록 (평균 별점 + 페이지) */
    public record SellerReviews(
            Double averageRating,   // 리뷰 없으면 null
            PageResponse<Detail> reviews
    ) {}
}