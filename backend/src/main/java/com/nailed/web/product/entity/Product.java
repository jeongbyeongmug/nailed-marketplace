package com.nailed.web.product.entity;

import com.nailed.common.entity.SoftDeleteEntity;
import com.nailed.common.enums.ProductCondition;
import com.nailed.common.enums.ProductStatus;
import com.nailed.web.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 상품 엔티티
 * - SoftDeleteEntity 상속 → created_at, updated_at, deleted_at 자동 관리
 * - 삭제는 status=DELETED + deleted_at 기록 방식 (소프트 삭제)
 */
@Entity
@Table(name = "products")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Product extends SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long productId;

    // 판매자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private Member seller;

    // 카테고리 (필수)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ProductGroup category;

    // 브랜드 (선택)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private ProductGroup brand;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "price", nullable = false)
    private int price;

    @Column(name = "shipping_fee", nullable = false)
    private int shippingFee;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    // 상품 상태 등급: S(새제품) / A(거의새것) / B(상태좋음) / C(상태보통) / D(사용감많음)
    @Enumerated(EnumType.STRING)
    @Column(name = "condition_code", length = 20, nullable = false)
    private ProductCondition conditionCode;

    // 배송 방법 (현재 DELIVERY 고정)
    @Column(name = "shipping_method", length = 20, nullable = false)
    @Builder.Default
    private String shippingMethod = "DELIVERY";

    @Column(name = "size", length = 30)
    private String size;

    // 판매 상태: ON_SALE / SOLD / DELETED
    @Enumerated(EnumType.STRING)
    @Column(name = "product_status", length = 20, nullable = false)
    @Builder.Default
    private ProductStatus productStatus = ProductStatus.ON_SALE;

    // 쉼표로 구분된 해시태그 (예: "#나이키,#운동화")
    @Column(name = "hashtags", length = 500)
    private String hashtags;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private int viewCount = 0;

    @Column(name = "wishlist_count", nullable = false)
    @Builder.Default
    private int wishlistCount = 0;

    @Column(name = "deleted_reason", length = 500)
    private String deletedReason;

    // 이미지 목록 (sort_order 순, sort_order=0이 대표 이미지)
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProductImage> images = new ArrayList<>();

    // ── 비즈니스 메서드 ──────────────────────────────

    /** 주문 취소 또는 관리자 복구 시 판매중으로 복원 */
    public void restore() {
        this.productStatus = ProductStatus.ON_SALE;
        this.deletedReason = null;
    }

    /** 결제(PAID) → 판매완료 */
    public void completeSale() {
        this.productStatus = ProductStatus.SOLD;
    }

    /**
     * 소프트 삭제
     * - product_status = DELETED, deleted_reason 기록
     * - SoftDeleteEntity.softDelete() → deleted_at 기록
     */
    public void delete(String reason) {
        this.deletedReason = reason;
        this.productStatus = ProductStatus.DELETED;
        softDelete();
    }

    /** 상품 정보 수정 */
    public void update(String title, ProductGroup category, ProductGroup brand,
                       int price, int shippingFee, String description, ProductCondition conditionCode,
                       String size, String hashtags) {
        this.title = title;
        this.category = category;
        this.brand = brand;
        this.price = price;
        this.shippingFee = shippingFee;
        this.description = description;
        this.conditionCode = conditionCode;
        this.size = size;
        this.hashtags = hashtags;
    }

}
