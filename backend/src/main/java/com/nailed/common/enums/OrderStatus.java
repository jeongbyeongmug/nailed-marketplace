package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 주문 상태 (메인 라이프사이클)
 *
 * 정상 흐름: PAID → REQUESTED → SHIPPING → DELIVERED
 * 취소 흐름: PAID → CANCELLED
 *
 * 주의: 취소 요청 진행 상태는 별도 컬럼(cancel_request_status)으로 관리됨
 *      → 따라서 OrderStatus 에서는 CANCEL_REQUESTED 상태 없음
 */
@Getter
@RequiredArgsConstructor
public enum OrderStatus {

    PAID("결제완료",       "결제가 완료된 상태"),
    REQUESTED("주문접수",   "주문이 접수된 상태"),
    SHIPPING("배송중",      "운송장이 등록되어 배송 중인 상태"),
    DELIVERED("배송완료",   "상품이 배송 완료된 상태(정산처리됨)"),
    CANCELLED("취소됨",      "주문이 최종 취소된 상태");

    private final String label;
    private final String description;
}
