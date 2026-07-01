package com.nailed.web.order.controller;
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
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;
    private final ShippingService shippingService;
    @PostMapping("")
    public ResponseEntity<OrderResponseDto> createOrder(
            @RequestParam("buyerId") String buyerId,
            @RequestParam("sellerId") String sellerId,
            @Valid @RequestBody OrderRequestDto requestDto
    ) {
        OrderResponseDto response = orderService.createOrder(buyerId, sellerId, requestDto);
        return ResponseEntity.created(URI.create("/api/orders/" + response.getOrderId())).body(response);
    }
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponseDto> getOrder(@PathVariable("orderId") String orderId) {
        return ResponseEntity.ok(orderService.getOrder(orderId));
    }
    // 운송장 등록 (판매자, mock)
    @PatchMapping("/{orderId}/shipping")
    public ResponseEntity<OrderResponseDto> registerTracking(
            @PathVariable("orderId") String orderId,
            @Valid @RequestBody ShippingRequestDto requestDto
    ) {
        return ResponseEntity.ok(
                shippingService.registerTracking(orderId, requestDto.getCarrierCode(), requestDto.getTrackingNumber())
        );
    }
    // 배송 완료 처리 (mock)
    @PatchMapping("/{orderId}/delivered")
    public ResponseEntity<OrderResponseDto> confirmDelivery(@PathVariable("orderId") String orderId) {
        return ResponseEntity.ok(shippingService.confirmDelivery(orderId));
    }
    // 결제 처리 (mock)
    @PatchMapping("/{orderId}/pay")
    public ResponseEntity<OrderResponseDto> mockPay(@PathVariable("orderId") String orderId) {
        return ResponseEntity.ok(orderService.mockPay(orderId));
    }
    // 주문 확인 (판매자)
    @PatchMapping("/{orderId}/confirm")
    public ResponseEntity<OrderResponseDto> confirmOrder(
            @PathVariable("orderId") String orderId,
            @RequestParam("sellerId") String sellerId) {
        return ResponseEntity.ok(orderService.confirmOrder(orderId, sellerId));
    }
    // 주문 취소 (구매자)
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponseDto> cancelOrder(
            @PathVariable("orderId") String orderId,
            @RequestParam("buyerId") String buyerId
    ) {
        return ResponseEntity.ok(orderService.cancelOrder(orderId, buyerId));
    }
}