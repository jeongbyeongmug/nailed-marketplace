package com.nailed.web.review.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.util.SecurityUtil;
import com.nailed.web.review.dto.ReviewRequest;
import com.nailed.web.review.dto.ReviewResponse;
import com.nailed.web.review.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // 리뷰 작성 (로그인 필요) — 배송 완료(DELIVERED) 상태 주문의 구매자만 가능
    @PostMapping("/api/reviews")
    public ResponseEntity<ApiResponse<ReviewResponse.Detail>> write(
            @Valid @RequestBody ReviewRequest.Write request) {
        String buyerId = SecurityUtil.getCurrentMemberId();
        ReviewResponse.Detail result = reviewService.write(buyerId, request);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // 판매자 리뷰 목록 조회 (비로그인 가능) — 평균 별점 + 리뷰 페이지 반환
    @GetMapping("/api/users/{memberId}/reviews")
    public ResponseEntity<ApiResponse<ReviewResponse.SellerReviews>> getSellerReviews(
            @PathVariable String memberId,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        ReviewResponse.SellerReviews result = reviewService.getSellerReviews(memberId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
