package com.nailed.web.product.repository;

import com.nailed.web.product.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    // 상품 이미지 목록 (sort_order 오름차순)
    List<ProductImage> findByProductProductIdOrderBySortOrderAsc(Long productId);

    // 목록 페이지 N+1 방지: 여러 상품의 대표 이미지(sort_order=0)를 한 번에 조회
    @Query("SELECT pi FROM ProductImage pi WHERE pi.product.productId IN :productIds AND pi.sortOrder = 0")
    List<ProductImage> findThumbnailsByProductIds(@Param("productIds") List<Long> productIds);

    // productId → 대표 이미지 URL 맵 반환 (여러 Service에서 공통 사용)
    default Map<Long, String> buildThumbnailMap(List<Long> productIds) {
        if (productIds.isEmpty()) return Map.of();
        List<ProductImage> thumbnails = findThumbnailsByProductIds(productIds);
        Map<Long, String> map = new HashMap<>();
        for (ProductImage img : thumbnails) {
            Long pid = img.getProduct().getProductId();
            if (!map.containsKey(pid)) {
                map.put(pid, img.getImageUrl());
            }
        }
        return map;
    }
}
