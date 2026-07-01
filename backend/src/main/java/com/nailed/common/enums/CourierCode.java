package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 택배사 코드
 * DB: orders.carrier_code VARCHAR(20)
 * 주석값: CJ/KOREA_POST/LOTTE/HANJIN/LOGEN
 */
@Getter
@RequiredArgsConstructor
public enum CourierCode {

    CJ("CJ대한통운", "CJ대한통운 택배"),
    LOGEN("로젠택배", "로젠택배"),
    HANJIN("한진택배", "한진택배"),
    KOREA_POST("우체국택배", "우체국택배"),
    LOTTE("롯데택배", "롯데글로벌로지스틱스");

    private final String label;
    private final String description;
}
