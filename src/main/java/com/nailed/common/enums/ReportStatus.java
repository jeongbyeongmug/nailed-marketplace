package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 신고 처리 상태
 * DB: reports.report_status VARCHAR(20) DEFAULT 'PENDING'
 *   - 단, 엔티티 기본값이 APPROVED라 신규 신고는 APPROVED(접수됨)로 저장됨 → PENDING 미사용
 * enum 값: APPROVED/REJECTED/DONE
 */
@Getter
@RequiredArgsConstructor
public enum ReportStatus {

    APPROVED("승인", "신고가 승인되어 접수된 상태"),
    REJECTED("반려", "신고가 반려된 상태"),
    DONE("완료", "신고 처리가 모두 완료된 상태");

    private final String label;
    private final String description;
}
