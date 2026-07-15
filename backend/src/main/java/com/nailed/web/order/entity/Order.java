package com.nailed.web.order.entity;
import com.nailed.common.enums.CancelRequestStatus;
import com.nailed.common.enums.CourierCode;
import com.nailed.common.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;
@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Order {
    @Id
    @Column(name = "order_id", length = 20)
    private String orderId;
    @Enumerated(EnumType.STRING)
    @Column(name = "order_status", length = 20)
    private OrderStatus orderStatus;
    private String buyerId;
    private String sellerId;
    private Long productId;

    // 수수료율(%) — 금액이 아니라 비율 값이 저장됨 (예: 2 → 2%를 의미)
    // OrderService.DEFAULT_COMMISSION_RATE 기준으로 주문 시점에 결정되어 저장됨
    private Integer commission;
    private Integer finalPrice;
    private Integer sellerSettlementAmount;
    private String receiverName;
    private String receiverPhone;
    private String receiverZipcode;
    private String receiverAddress;
    private String receiverAddressDetail;
    private String deliveryRequest;
    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private OrderStatus previousStatus;

    // 취소 "요청" 진행 상태 (메인 주문 상태인 orderStatus와는 별개로 관리됨)
    // 가능한 값: NONE(취소 요청 없음) / REQUESTED(취소 요청됨) / APPROVED(취소 승인 완료)
    @Enumerated(EnumType.STRING)
    private CancelRequestStatus cancelRequestStatus;
    private LocalDateTime cancelRequestedAt;
    private String cancelRequestReason;
    private LocalDateTime cancelRespondedAt;
    @Enumerated(EnumType.STRING)
    private CourierCode carrierCode;
    private String trackingNumber;
    private LocalDateTime paidAt;
    private LocalDateTime requestedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    // 주문 상태를 변경하면서 변경 직전 상태를 previousStatus에 함께 기록함
    // (마이페이지 등에서 "이전 상태로 되돌아갈 수 있는지" 판단할 때 사용됨)
    public void changeStatus(OrderStatus newStatus) {
        this.previousStatus = this.orderStatus;
        this.orderStatus = newStatus;
    }
    // 결제 완료 → paidAt 기록, previousStatus = null (최초 상태 전환)
    public void markAsPaid() {
        changeStatus(OrderStatus.PAID);
        this.paidAt = LocalDateTime.now();
    }
    // 구매자 배송 요청 → requestedAt 기록, previousStatus = PAID
    public void markAsRequested() {
        changeStatus(OrderStatus.REQUESTED);
        this.requestedAt = LocalDateTime.now();
    }
    public void startShipping(CourierCode carrierCode, String trackingNumber) {
        changeStatus(OrderStatus.SHIPPING);
        this.carrierCode = carrierCode;
        this.trackingNumber = trackingNumber;
        this.shippedAt = LocalDateTime.now();
    }
    public void markAsDelivered() {
        changeStatus(OrderStatus.DELIVERED);
        this.deliveredAt = LocalDateTime.now();
    }
    public void cancel() {
        changeStatus(OrderStatus.CANCELLED);
        this.cancelledAt = LocalDateTime.now();
        this.cancelRequestStatus = CancelRequestStatus.APPROVED;
        this.cancelRespondedAt = LocalDateTime.now();
    }
    public void cancelByAdmin(String reason) {
        this.cancelRequestReason = reason;
        cancel();
    }
}
