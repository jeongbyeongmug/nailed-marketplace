package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 주문 취소 요청 처리 상태
 * DB: orders.cancel_request_status VARCHAR(20) DEFAULT 'NONE'
 *
 * 흐름: NONE → REQUESTED → (APPROVED | REJECTED)
 */
@Getter
@RequiredArgsConstructor
public enum CancelRequestStatus {

    NONE("없음", "취소 요청이 없는 기본 상태"),
    REQUESTED("취소 요청", "구매자가 취소를 요청한 상태"),
    APPROVED("취소 승인", "판매자가 취소 요청을 승인한 상태"),
    REJECTED("취소 거절", "판매자가 취소 요청을 거절한 상태");

    private final String label;
    private final String description;
}
