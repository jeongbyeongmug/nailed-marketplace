package com.nailed.web.review.service;

import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.order.entity.Order;
import com.nailed.web.order.repository.OrderRepository;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.repository.ProductImageRepository;
import com.nailed.web.product.repository.ProductRepository;
import com.nailed.web.review.dto.ReviewRequest;
import com.nailed.web.review.dto.ReviewResponse;
import com.nailed.web.review.entity.Review;
import com.nailed.web.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final MemberRepository memberRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;

    /**
     * 리뷰 작성
     * - 배송 완료(DELIVERED) 상태의 주문에 대해서만 작성 가능
     * - 주문의 구매자 본인만 작성 가능
     * - 주문당 1개 제한 (UNIQUE 제약 + 사전 중복 체크)
     */
    @Transactional
    public ReviewResponse.Detail write(String buyerId, ReviewRequest.Write req) {
        Order order = orderRepository.findById(req.orderId())
                .orElseThrow(() -> new CustomException(ErrorCode.ORDER_NOT_FOUND));

        if (!"DELIVERED".equals(order.getOrderStatus())) {
            throw new CustomException(ErrorCode.REVIEW_NOT_ALLOWED);
        }
        if (!order.getBuyerId().equals(buyerId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
        if (reviewRepository.existsByOrderOrderId(req.orderId())) {
            throw new CustomException(ErrorCode.REVIEW_ALREADY_EXISTS);
        }

        Member buyer = memberRepository.findById(buyerId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        Review review = Review.builder()
                .order(order)
                .buyer(buyer)
                .rating(req.rating())
                .content(req.content())
                .build();

        Review saved = reviewRepository.save(review);

        // 단건도 배치 변환 로직을 그대로 재사용 (1건짜리 맵 구성)
        List<Long> productIds = collectProductIds(List.of(saved));
        Map<Long, Product> productMap = loadProductMap(productIds);
        Map<Long, String> thumbnailMap = productImageRepository.buildThumbnailMap(productIds);
        return toDetail(saved, productMap, thumbnailMap);
    }

    /**
     * 판매자 리뷰 목록 조회
     * - 평균 별점과 리뷰 페이지를 함께 반환
     * - 비로그인 사용자도 조회 가능
     */
    public ReviewResponse.SellerReviews getSellerReviews(String sellerId, Pageable pageable) {
        if (!memberRepository.existsById(sellerId)) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }

        List<Object[]> statsList = reviewRepository.findReviewStatsBySellerId(sellerId);
        Object[] stats = statsList.isEmpty() ? new Object[]{0L, null} : statsList.get(0);
        Double averageRating = stats[1] != null ? ((Number) stats[1]).doubleValue() : null;

        Page<Review> page = reviewRepository
                .findSellerReviews(sellerId, pageable);

        // 상품 정보 + 썸네일 배치 조회 (N+1 방지)
        List<Long> productIds = collectProductIds(page.getContent());
        Map<Long, Product> productMap = loadProductMap(productIds);
        Map<Long, String> thumbnailMap = productImageRepository.buildThumbnailMap(productIds);

        Page<ReviewResponse.Detail> detailPage = page.map(r ->
                toDetail(r, productMap, thumbnailMap));

        return new ReviewResponse.SellerReviews(averageRating, PageResponse.of(detailPage));
    }

    /** 리뷰 목록에서 상품 ID 수집 (productId 없는 주문은 제외) */
    private List<Long> collectProductIds(List<Review> reviews) {
        List<Long> productIds = new ArrayList<>();
        for (Review r : reviews) {
            Long productId = r.getOrder().getProductId();
            if (productId != null) {
                productIds.add(productId);
            }
        }
        return productIds;
    }

    /** productId → Product 맵 배치 조회 */
    private Map<Long, Product> loadProductMap(List<Long> productIds) {
        Map<Long, Product> productMap = new HashMap<>();
        if (!productIds.isEmpty()) {
            for (Product p : productRepository.findAllById(productIds)) {
                productMap.put(p.getProductId(), p);
            }
        }
        return productMap;
    }

    /**
     * Review → Detail DTO 변환 (미리 조회한 맵 활용)
     * - write(단건) / getSellerReviews(목록) 양쪽에서 공통 사용
     * - 상품 조회가 맵 참조로 대체되므로 N+1 쿼리 없음
     */
    private ReviewResponse.Detail toDetail(Review review,
                                            Map<Long, Product> productMap,
                                            Map<Long, String> thumbnailMap) {
        Long productId = review.getOrder().getProductId();

        String productTitle = null;
        Integer price = null;
        String productImageUrl = null;

        if (productId != null) {
            Product product = productMap.get(productId);
            if (product != null) {
                productTitle = product.getTitle();
                price = product.getPrice();
            }
            productImageUrl = thumbnailMap.get(productId);
        }

        return new ReviewResponse.Detail(
                review.getReviewId(),
                review.getOrder().getOrderId(),
                review.getBuyer().getNickname(),
                review.getRating(),
                review.getContent(),
                review.getCreatedAt(),
                productTitle,
                productImageUrl,
                price
        );
    }

}
