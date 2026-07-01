package com.nailed.web.review.repository;

import com.nailed.web.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // 주문당 리뷰 중복 여부 확인
    boolean existsByOrderOrderId(String orderId);

    // 판매자 기준 리뷰 목록 (최신순) — order/buyer 를 함께 로딩해 N+1 방지
    @Query(value = "SELECT r FROM Review r JOIN FETCH r.order o JOIN FETCH r.buyer " +
                   "WHERE o.sellerId = :sellerId ORDER BY r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM Review r WHERE r.order.sellerId = :sellerId")
    Page<Review> findSellerReviews(@Param("sellerId") String sellerId, Pageable pageable);

    // 판매자 리뷰 건수 + 평균 별점 한 번에 조회 (row[0]=count, row[1]=avg)
    @Query("SELECT COUNT(r), AVG(r.rating) FROM Review r WHERE r.order.sellerId = :sellerId")
    List<Object[]> findReviewStatsBySellerId(@Param("sellerId") String sellerId);
}
