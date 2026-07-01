package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 상품 상태 등급
 * DB: products.condition_code VARCHAR(20)
 * 저장값: S / A / B / C / D
 */
@Getter
@RequiredArgsConstructor
public enum ProductCondition {

    S("새제품",      "새제품(미사용)"),
    A("거의 새것",   "거의 새것"),
    B("상태 좋음",   "중고(상태 좋음)"),
    C("상태 보통",   "중고(상태 보통)"),
    D("사용감 많음", "중고(사용감 많음)");

    private final String label;
    private final String description;
}
