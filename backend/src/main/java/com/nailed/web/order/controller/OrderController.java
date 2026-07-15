package com.nailed.web.order.controller;
import com.nailed.common.response.ApiResponse;
import com.nailed.common.util.SecurityUtil;
import com.nailed.web.order.dto.OrderPayRequestDto;
import com.nailed.web.order.dto.OrderRequestDto;
import com.nailed.web.order.dto.OrderResponseDto;
import com.nailed.web.order.dto.ShippingRequestDto;
import com.nailed.web.order.service.OrderService;
import com.nailed.web.order.service.ShippingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;

/**
 * 주문 API — 모든 엔드포인트는 JWT 인증 필수.
 * 요청자 식별은 클라이언트 파라미터가 아니라 SecurityContext(토큰의 memberId)에서 가져온다.
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;
    private final ShippingService shippingService;

    @PostMapping("")
    public ResponseEntity<ApiResponse<OrderResponseDto>> createOrder(
            @Valid @RequestBody OrderRequestDto requestDto
    ) {
        String buyerId = SecurityUtil.getCurrentMemberId();
        OrderResponseDto response = orderService.createOrder(buyerId, requestDto);
        return ResponseEntity.created(URI.create("/api/orders/" + response.getOrderId()))
                .body(ApiResponse.success(response));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getOrder(@PathVariable("orderId") String orderId) {
        String viewerId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrder(orderId, viewerId)));
    }

    // 운송장 등록 (판매자, mock)
    @PatchMapping("/{orderId}/shipping")
    public ResponseEntity<ApiResponse<OrderResponseDto>> registerTracking(
            @PathVariable("orderId") String orderId,
            @Valid @RequestBody ShippingRequestDto requestDto
    ) {
        String sellerId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(
                shippingService.registerTracking(orderId, sellerId, requestDto.getCarrierCode(), requestDto.getTrackingNumber())
        ));
    }

    // 배송 완료 처리 (구매자 수취 확인, mock)
    @PatchMapping("/{orderId}/delivered")
    public ResponseEntity<ApiResponse<OrderResponseDto>> confirmDelivery(@PathVariable("orderId") String orderId) {
        String buyerId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(shippingService.confirmDelivery(orderId, buyerId)));
    }

    // 결제 처리 (구매자, mock) — 바디의 expectedAmount로 결제 금액 일치 검증(O007)
    @PatchMapping("/{orderId}/pay")
    public ResponseEntity<ApiResponse<OrderResponseDto>> mockPay(
            @PathVariable("orderId") String orderId,
            @RequestBody(required = false) OrderPayRequestDto requestDto
    ) {
        String buyerId = SecurityUtil.getCurrentMemberId();
        Integer expectedAmount = requestDto != null ? requestDto.getExpectedAmount() : null;
        return ResponseEntity.ok(ApiResponse.success(orderService.mockPay(orderId, buyerId, expectedAmount)));
    }

    // 주문 확인 (판매자)
    @PatchMapping("/{orderId}/confirm")
    public ResponseEntity<ApiResponse<OrderResponseDto>> confirmOrder(@PathVariable("orderId") String orderId) {
        String sellerId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(orderService.confirmOrder(orderId, sellerId)));
    }

    // 주문 취소 (구매자)
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<OrderResponseDto>> cancelOrder(@PathVariable("orderId") String orderId) {
        String buyerId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(orderService.cancelOrder(orderId, buyerId)));
    }
}
