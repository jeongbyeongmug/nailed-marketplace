package com.nailed.web.admin.service;

import com.nailed.common.enums.OrderStatus;
import com.nailed.common.enums.ProductStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminOrderCancelRequest;
import com.nailed.web.admin.dto.AdminOrderResponse;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.order.entity.Order;
import com.nailed.web.order.repository.OrderRepository;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.entity.ProductImage;
import com.nailed.web.product.repository.ProductImageRepository;
import com.nailed.web.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminOrderService {

    private final OrderRepository orderRepository;
    private final MemberRepository memberRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;

    public PageResponse<AdminOrderResponse.Summary> getOrders(
            String keyword,
            String orderStatus,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {
        Page<Order> page = orderRepository.searchAdminOrders(
                blankToNull(keyword),
                parseOrderStatus(orderStatus),
                dateFrom != null ? dateFrom.atStartOfDay() : null,
                dateTo != null ? dateTo.atTime(LocalTime.MAX) : null,
                pageable
        );

        List<Order> orders = page.getContent();
        Map<String, Member> memberMap = buildMemberMap(orders);
        Map<Long, Product> productMap = buildProductMap(orders);
        Map<Long, String> thumbnailMap = buildThumbnailMap(productMap.keySet());

        return PageResponse.of(page.map(order ->
                toSummary(order, memberMap, productMap, thumbnailMap)));
    }

    private AdminOrderResponse.Summary toSummary(
            Order order,
            Map<String, Member> memberMap,
            Map<Long, Product> productMap,
            Map<Long, String> thumbnailMap) {
        Member buyer = memberMap.get(order.getBuyerId());
        Member seller = memberMap.get(order.getSellerId());
        Product product = productMap.get(order.getProductId());

        return new AdminOrderResponse.Summary(
                order.getOrderId(),
                order.getBuyerId(),
                buyer != null ? buyer.getUserid() : null,
                buyer != null ? buyer.getNickname() : null,
                order.getSellerId(),
                seller != null ? seller.getUserid() : null,
                seller != null ? seller.getNickname() : null,
                order.getProductId(),
                product != null ? product.getTitle() : null,
                thumbnailMap.get(order.getProductId()),
                order.getOrderStatus() != null ? order.getOrderStatus().name() : null,
                toProductInfo(product),
                order.getCommission(),
                order.getFinalPrice(),
                order.getSellerSettlementAmount(),
                order.getPaidAt(),
                completedAt(order),
                order.getUpdatedAt(),
                order.getPreviousStatus() != null ? order.getPreviousStatus().name() : null,
                order.getCancelRequestReason(),
                order.getRequestedAt(),
                order.getShippedAt(),
                order.getCancelledAt()
        );
    }

    @Transactional
    public AdminOrderResponse.Summary cancelOrder(String orderId, AdminOrderCancelRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new CustomException(ErrorCode.ORDER_NOT_FOUND));

        validateCancelableStatus(order.getOrderStatus());

        String reason = blankToNull(request.reason());
        if (reason == null || reason.length() > 500) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        order.cancelByAdmin(reason);

        int updatedProductCount = productRepository.updateProductStatus(order.getProductId(), ProductStatus.ON_SALE);
        if (updatedProductCount == 0) {
            throw new CustomException(ErrorCode.PRODUCT_NOT_FOUND);
        }

        return toSummary(order);
    }

    private AdminOrderResponse.ProductInfo toProductInfo(Product product) {
        if (product == null) {
            return null;
        }
        return new AdminOrderResponse.ProductInfo(
                product.getPrice(),
                product.getShippingFee()
        );
    }

    private Map<String, Member> buildMemberMap(List<Order> orders) {
        List<String> memberIds = orders.stream()
                .flatMap(order -> Stream.of(order.getBuyerId(), order.getSellerId()))
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();
        if (memberIds.isEmpty()) {
            return Map.of();
        }
        return memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getMemberId, Function.identity()));
    }

    private Map<Long, Product> buildProductMap(List<Order> orders) {
        List<Long> productIds = orders.stream()
                .map(Order::getProductId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getProductId, Function.identity()));
    }

    private Map<Long, String> buildThumbnailMap(Collection<Long> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return productImageRepository.findThumbnailsByProductIds(productIds.stream().toList())
                .stream()
                .collect(Collectors.toMap(
                        image -> image.getProduct().getProductId(),
                        ProductImage::getImageUrl,
                        (existing, replacement) -> existing
                ));
    }

    private LocalDateTime completedAt(Order order) {
        if (order.getOrderStatus() == OrderStatus.DELIVERED) {
            return order.getDeliveredAt();
        }
        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            return order.getCancelledAt();
        }
        return null;
    }

    private void validateCancelableStatus(OrderStatus orderStatus) {
        if (orderStatus == OrderStatus.PAID
                || orderStatus == OrderStatus.REQUESTED
                || orderStatus == OrderStatus.SHIPPING) {
            return;
        }
        throw new CustomException(ErrorCode.CANCEL_NOT_ALLOWED);
    }

    private AdminOrderResponse.Summary toSummary(Order order) {
        List<Order> orders = List.of(order);
        Map<String, Member> memberMap = buildMemberMap(orders);
        Map<Long, Product> productMap = buildProductMap(orders);
        Map<Long, String> thumbnailMap = buildThumbnailMap(productMap.keySet());
        return toSummary(order, memberMap, productMap, thumbnailMap);
    }

    private OrderStatus parseOrderStatus(String orderStatus) {
        String value = blankToNull(orderStatus);
        if (value == null) {
            return null;
        }
        try {
            return OrderStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private String blankToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
