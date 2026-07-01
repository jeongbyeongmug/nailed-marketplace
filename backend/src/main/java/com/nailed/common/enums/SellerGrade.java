package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SellerGrade {

    BRONZE("브론즈", "브론즈 등급 판매자"),
    SILVER("실버", "실버 등급 판매자"),
    GOLD("골드", "골드 등급 판매자"),
    DIAMOND("다이아몬드", "다이아몬드 등급 판매자");

    private final String label;
    private final String description;
}
