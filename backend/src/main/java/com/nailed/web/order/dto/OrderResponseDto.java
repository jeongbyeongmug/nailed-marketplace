package com.nailed.web.order.dto;
import com.nailed.common.enums.CancelRequestStatus;
import com.nailed.common.enums.CourierCode;
import com.nailed.web.order.entity.Order;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Builder
public class OrderResponseDto {

    // 주문 기본 정보
    private String orderId;
    private Long productId;
    private String buyerId;
    private String sellerId;

    // 결제 금액 정보
    private Integer commission;       // 수수료율 (%)
    private Integer productPrice;     // 상품 금액
    private Integer shippingFee;      // 배송비
    private Integer finalPrice;       // 최종 결제 금액 (상품가 + 배송비 + 수수료)
    private Integer sellerSettlementAmount; // 판매자 정산 금액

    // 배송지 정보
    private String receiverName;
    private String receiverPhone;
    private String receiverZipcode;
    private String receiverAddress;
    private String receiverAddressDetail;
    private String deliveryRequest;   // 배송 요청사항

    // 주문 상태
    private String orderStatus;       // 현재 주문 상태
    private String previousStatus;    // 취소 전 이전 상태

    // 취소 정보
    private CancelRequestStatus cancelRequestStatus;
    private LocalDateTime cancelRequestedAt;
    private String cancelRequestReason;
    private LocalDateTime cancelRespondedAt;

    // 배송 추적 정보
    private CourierCode carrierCode;
    private String trackingNumber;

    // 주문 단계별 시간
    private LocalDateTime updatedAt;
    private LocalDateTime paidAt;       // 결제 완료 시각
    private LocalDateTime requestedAt;  // 주문 접수 시각
    private LocalDateTime shippedAt;    // 배송 시작 시각
    private LocalDateTime deliveredAt;  // 배송 완료 시각
    private LocalDateTime cancelledAt;  // 취소 완료 시각

    // Order 엔티티 → DTO 변환
    // productPrice, shippingFee는 Order에 없어서 Product에서 직접 받아옴
    public static OrderResponseDto from(Order order, int shippingFee, int productPrice) {
        return OrderResponseDto.builder()
                .orderId(order.getOrderId())
                .productId(order.getProductId())
                .buyerId(order.getBuyerId())
                .sellerId(order.getSellerId())
                .commission(order.getCommission())
                .productPrice(productPrice)
                .shippingFee(shippingFee)
                .finalPrice(order.getFinalPrice())
                .sellerSettlementAmount(order.getSellerSettlementAmount())
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .receiverZipcode(order.getReceiverZipcode())
                .receiverAddress(order.getReceiverAddress())
                .receiverAddressDetail(order.getReceiverAddressDetail())
                .deliveryRequest(order.getDeliveryRequest())
                .orderStatus(order.getOrderStatus() != null ? order.getOrderStatus().name() : null)
                .previousStatus(order.getPreviousStatus() != null ? order.getPreviousStatus().name() : null)
                .cancelRequestStatus(order.getCancelRequestStatus())
                .cancelRequestedAt(order.getCancelRequestedAt())
                .cancelRequestReason(order.getCancelRequestReason())
                .cancelRespondedAt(order.getCancelRespondedAt())
                .carrierCode(order.getCarrierCode())
                .trackingNumber(order.getTrackingNumber())
                .updatedAt(order.getUpdatedAt())
                .paidAt(order.getPaidAt())
                .requestedAt(order.getRequestedAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .cancelledAt(order.getCancelledAt())
                .build();
    }
}