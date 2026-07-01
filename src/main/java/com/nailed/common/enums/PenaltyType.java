package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 회원 제재 유형
 * DB: member_penalties.penalty_type VARCHAR(20)
 * CHECK 제약: penalty_type IN ('WARNING', 'SUSPEND', 'BAN')
 *
 * 정지 일수(penalty_days):
 *   - WARNING: NULL
 *   - SUSPEND: 3 / 7 / 30
 *   - BAN: NULL (영구정지)
 */
@Getter
@RequiredArgsConstructor
public enum PenaltyType {

    WARNING("경고", "경고 처분"),
    SUSPEND("기간정지", "기간 정지 (3/7/30일)"),
    BAN("영구정지", "영구 차단");

    private final String label;
    private final String description;
}
