package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 상품 그룹 구분 (카테고리 / 브랜드)
 * DB: product_groups.group_type VARCHAR(20)
 * CHECK 제약: group_type IN ('CATEGORY', 'BRAND')
 */
@Getter
@RequiredArgsConstructor
public enum GroupType {

    CATEGORY("카테고리", "상품 분류 카테고리"),
    BRAND("브랜드", "상품 브랜드");

    private final String label;
    private final String description;
}
