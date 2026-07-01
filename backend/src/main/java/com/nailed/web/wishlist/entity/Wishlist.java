package com.nailed.web.wishlist.entity;

import com.nailed.web.member.entity.Member;
import com.nailed.web.product.entity.Product;
import jakarta.persistence.*;
import lombok.*;

/**
 * 찜 엔티티 (wishlists 테이블)
 * - UK (member_id, product_id) 로 동일 회원의 중복 찜 차단
 * - 찜수(products.wishlist_count) 는 WishlistService 에서 별도 동기화
 */
@Entity
@Table(
        name = "wishlists",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_wishlists_member_product",
                columnNames = {"member_id", "product_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Wishlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wishlist_id")
    private Long wishlistId;

    // 찜한 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 찜한 상품
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
}
