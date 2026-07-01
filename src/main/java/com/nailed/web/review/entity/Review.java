package com.nailed.web.review.entity;

import com.nailed.common.entity.CreatedOnlyEntity;
import com.nailed.web.member.entity.Member;
import com.nailed.web.order.entity.Order;
import jakarta.persistence.*;
import lombok.*;

/**
 * 리뷰 엔티티
 * - 구매자 → 판매자 단방향 별점/텍스트 리뷰
 * - 주문당 1개 제한: DB UNIQUE(order_id) + 서비스 레이어 중복 체크로 이중 보호
 */
@Entity
@Table(name = "reviews")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Review extends CreatedOnlyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long reviewId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private Member buyer;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "content", length = 500)
    private String content;
}
