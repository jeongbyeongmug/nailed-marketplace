package com.nailed.web.order.service;

import com.nailed.common.enums.CancelRequestStatus;
import com.nailed.common.enums.OrderStatus;
import com.nailed.common.enums.ProductStatus;
import com.nailed.web.order.dto.OrderRequestDto;
import com.nailed.web.order.dto.OrderResponseDto;
import com.nailed.web.order.entity.Order;
import com.nailed.web.order.repository.OrderRepository;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import org.springframework.dao.PessimisticLockingFailureException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private static final int DEFAULT_COMMISSION_RATE = 2;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Transactional
    public OrderResponseDto createOrder(String buyerId, String sellerId, OrderRequestDto req) {
        if (buyerId.equals(sellerId)) {
            throw new CustomException(ErrorCode.SELF_ORDER_NOT_ALLOWED);
        }
        Product product;
        try {
            // 일반 findById 대신 레포지토리에 추가해 둔 findByIdWithLock을 사용해 DB 락을 선점합니다.
            product = productRepository.findByIdWithLock(req.getProductId())
                    .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다. productId=" + req.getProductId()));
        } catch (PessimisticLockingFailureException e) {
            // 동시에 여러 요청이 들어와 먼저 잡힌 락 때문에 실패(타임아웃 등)한 경우 
            // 아까 등록해 둔 O012(409 Conflict) 에러 코드를 실어서 커스텀 예외를 던집니다.
            throw new CustomException(ErrorCode.LOCK_ACQUISITION_FAILED);
        }

        // 락을 획득하고 들어왔으나, 먼저 수행된 트랜잭션이 이미 결제를 마쳐 SOLD 상태로 변했다면 안전하게 차단합니다.
        if (product.getProductStatus() != ProductStatus.ON_SALE) {
            throw new CustomException(ErrorCode.PRODUCT_ALREADY_SOLD);
        }
        // 수수료 = (상품가 + 배송비) × 수수료율, 정산금액 = 최종 결제금액 - 수수료
        // 수수료는 10원 단위로 반올림하여 계산
        int productPrice        = product.getPrice();
        int shippingFee         = product.getShippingFee();
        double rawCommission    = (productPrice + shippingFee) * DEFAULT_COMMISSION_RATE / 100.0;
        int commissionAmount    = (int) (Math.round(rawCommission / 10.0) * 10);
        int finalPrice          = productPrice + shippingFee + commissionAmount;
        int sellerSettlementAmount = finalPrice - commissionAmount;

        Order order = Order.builder()
                .orderId(generateOrderId())
                .cancelRequestStatus(CancelRequestStatus.NONE) // 취소 요청 없음으로 초기화
                .productId(req.getProductId())
                .buyerId(buyerId)
                .sellerId(sellerId)
                .commission(DEFAULT_COMMISSION_RATE)        // 수수료율 2% 저장
                .finalPrice(finalPrice)                     // 구매자 최종 결제 금액
                .sellerSettlementAmount(sellerSettlementAmount) // 판매자 정산 금액
                .receiverName(req.getReceiverName())
                .receiverPhone(req.getReceiverPhone())
                .receiverZipcode(req.getReceiverZipcode())
                .receiverAddress(req.getReceiverAddress())
                .receiverAddressDetail(req.getReceiverAddressDetail())
                .deliveryRequest(req.getDeliveryRequest())
                .build();

        order.markAsPaid();  // 주문 상태 → PAID, 결제 시각 기록
        productRepository.updateProductStatus(req.getProductId(), ProductStatus.SOLD); // 상품 상태 → 판매완료

     // productPrice, shippingFee는 Order 엔티티에 없으므로 Product 에서 직접 받아옴
        return OrderResponseDto.from(orderRepository.save(order), shippingFee, productPrice);
    }

    public OrderResponseDto getOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문입니다. orderId=" + orderId));
        Product product = productRepository.findById(order.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다. productId=" + order.getProductId()));
        return OrderResponseDto.from(order, product.getShippingFee(), product.getPrice());
    }

    @Transactional
    public OrderResponseDto mockPay(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문입니다. orderId=" + orderId));
        Product product = productRepository.findById(order.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다. productId=" + order.getProductId()));
        order.markAsPaid();
        return OrderResponseDto.from(orderRepository.save(order), product.getShippingFee(), product.getPrice());
    }

    @Transactional
    public OrderResponseDto confirmOrder(String orderId, String sellerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문입니다. orderId=" + orderId));
        if (!sellerId.equals(order.getSellerId())) {
            throw new CustomException(ErrorCode.ORDER_UNAUTHORIZED);
        }
        if (!OrderStatus.PAID.name().equals(order.getOrderStatus())) {
            throw new CustomException(ErrorCode.ORDER_INVALID_STATUS);
        }
        order.markAsRequested();
        Product product = productRepository.findById(order.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다."));
        return OrderResponseDto.from(orderRepository.save(order), product.getShippingFee(), product.getPrice());
    }

    @Transactional
    public OrderResponseDto cancelOrder(String orderId, String buyerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문입니다. orderId=" + orderId));
        if (!buyerId.equals(order.getBuyerId())) {
            throw new CustomException(ErrorCode.ORDER_UNAUTHORIZED);
        }
        if (!OrderStatus.PAID.name().equals(order.getOrderStatus())) {
            throw new CustomException(ErrorCode.ORDER_INVALID_STATUS);
        }
        orderRepository.cancelOrder(orderId);
        productRepository.updateProductStatus(order.getProductId(), ProductStatus.ON_SALE);
        Product product = productRepository.findById(order.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다. productId=" + order.getProductId()));
        // DB를 직접 수정했기 때문에 변경된 값을 가져오려면 다시 조회해야 함
        Order cancelledOrder = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문입니다. orderId=" + orderId));
        return OrderResponseDto.from(cancelledOrder, product.getShippingFee(), product.getPrice());
    }

    private String generateOrderId() {
        long next = orderRepository.count() + 1;
        return String.format("ORDER_%03d", next);
    }
}