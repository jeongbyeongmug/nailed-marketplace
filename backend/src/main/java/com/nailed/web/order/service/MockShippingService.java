package com.nailed.web.order.service;
import com.nailed.common.enums.CourierCode;
import com.nailed.common.enums.OrderStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.util.EnumUtil;
import com.nailed.web.member.service.SellerGradeService;
import com.nailed.web.order.dto.OrderResponseDto;
import com.nailed.web.order.entity.Order;
import com.nailed.web.order.repository.OrderRepository;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class MockShippingService implements ShippingService {
    // 운송장 번호 형식: 숫자 10~13자리만 허용
    private static final Pattern TRACKING_PATTERN = Pattern.compile("^[0-9]{10,13}$");
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final SellerGradeService sellerGradeService;
    @Override
    public OrderResponseDto registerTracking(String orderId, String sellerId, String carrierCode, String trackingNumber) {
        CourierCode courier = EnumUtil.parse(CourierCode.class, carrierCode, ErrorCode.INVALID_COURIER_CODE);
        if (!TRACKING_PATTERN.matcher(trackingNumber).matches()) {
            throw new CustomException(ErrorCode.INVALID_TRACKING_NUMBER);
        }
        Order order = findOrder(orderId);
        // 판매자 본인만 운송장 등록 가능 — O003
        if (!sellerId.equals(order.getSellerId())) {
            throw new CustomException(ErrorCode.ORDER_UNAUTHORIZED);
        }
        if (order.getOrderStatus() != OrderStatus.REQUESTED) {
            throw new CustomException(ErrorCode.DELIVERY_INVALID_STATUS);
        }
        order.startShipping(courier, trackingNumber);
        Order savedOrder = orderRepository.save(order);
        // 주문 상태 변경 시 판매자의 거래완료 건수 등이 바뀔 수 있으므로 등급을 재계산
        sellerGradeService.refreshSellerGrade(savedOrder.getSellerId());
        Product product = productRepository.findById(savedOrder.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다. productId=" + savedOrder.getProductId()));
        return OrderResponseDto.from(savedOrder, product.getShippingFee(), product.getPrice());
    }
    @Override
    public OrderResponseDto confirmDelivery(String orderId, String buyerId) {
        Order order = findOrder(orderId);
        // 구매자 본인만 수취 확인 가능 — O003
        if (!buyerId.equals(order.getBuyerId())) {
            throw new CustomException(ErrorCode.ORDER_UNAUTHORIZED);
        }
        if (order.getOrderStatus() != OrderStatus.SHIPPING) {
            throw new CustomException(ErrorCode.DELIVERY_INVALID_STATUS);
        }
        order.markAsDelivered();
        Order savedOrder = orderRepository.save(order);
        // 거래완료(DELIVERED) 건수가 늘어나므로 판매자 등급 재계산
        sellerGradeService.refreshSellerGrade(savedOrder.getSellerId());
        Product product = productRepository.findById(savedOrder.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 상품입니다. productId=" + savedOrder.getProductId()));
        return OrderResponseDto.from(savedOrder, product.getShippingFee(), product.getPrice());
    }
    private Order findOrder(String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문입니다. orderId=" + orderId));
    }
}
