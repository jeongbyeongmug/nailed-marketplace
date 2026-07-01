package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 신고 사유 코드
 * DB: reports.reason_code VARCHAR(30)
 * 주석값: FRAUD/MISLEADING_INFO/PROHIBITED_ITEM/ETC 등
 */
@Getter
@RequiredArgsConstructor
public enum ReportReason {

    FRAUD("사기", "사기 의심 거래"),
    MISLEADING_INFO("상품 정보 허위/불일치", "상품 정보 허위/불일치"),
    PROHIBITED_ITEM("금지상품", "거래 금지 품목"),
    ETC("기타", "기타 신고 사유");

    private final String label;
    private final String description;
}
