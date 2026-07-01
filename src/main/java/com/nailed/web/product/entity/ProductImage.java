package com.nailed.web.product.entity;

import com.nailed.common.entity.CreatedOnlyEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 상품 이미지 엔티티
 * - sort_order = 0 이 대표(썸네일) 이미지
 * - CreatedOnlyEntity 상속 → created_at 자동 관리 (updated_at 없음)
 */
@Entity
@Table(name = "product_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProductImage extends CreatedOnlyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id")
    private Long imageId;

    // 이미지가 속한 상품
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    // 저장된 이미지 경로 (예: /images/products/PRD_001_1.jpg)
    @Column(name = "image_url", length = 500, nullable = false)
    private String imageUrl;

    // 표시 순서 (0 = 대표 이미지)
    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
