package com.nailed.web.order.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 결제(mock) 요청 바디.
 * expectedAmount: 클라이언트 화면에 표시된 결제 금액 —
 * 서버에 저장된 주문 최종 결제액과 다르면 O007(결제 금액 불일치)로 차단한다.
 */
@Getter
@NoArgsConstructor
public class OrderPayRequestDto {
    private Integer expectedAmount;
}
