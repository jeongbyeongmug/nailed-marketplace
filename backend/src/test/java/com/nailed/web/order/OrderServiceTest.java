package com.nailed.web.order;

import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nailed.common.enums.GroupType;
import com.nailed.common.enums.ProductCondition;
import com.nailed.common.enums.ProductStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.order.dto.OrderRequestDto;
import com.nailed.web.order.dto.OrderResponseDto;
import com.nailed.web.order.repository.OrderRepository;
import com.nailed.web.order.service.OrderService;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.entity.ProductGroup;
import com.nailed.web.product.repository.ProductGroupRepository;
import com.nailed.web.product.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 주문 도메인 비즈니스 로직 통합 테스트 (동시성 외 커버리지).
 *
 * <p>정산 금액 계산, 주문 상태 전이(PAID → REQUESTED / CANCELLED),
 * 소유자 권한 검증, 취소 시 상품 상태 복구 등 주문 서비스의 핵심 규칙을 검증한다.
 * 실제 MySQL + 실제 트랜잭션에서 서비스 → 리포지토리를 그대로 태운다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("주문 서비스 - 정산 계산 · 상태 전이 · 권한 검증")
class OrderServiceTest {

    @Autowired private OrderService orderService;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private ProductGroupRepository productGroupRepository;

    private Long productId;
    private String sellerId;

    @BeforeEach
    void setUp() {
        cleanUp();

        Member seller = memberRepository.save(Member.builder()
                .memberId("SELLER0000000000003")
                .userid("seller03")
                .passwordHash("hashed-password")
                .nickname("판매자03")
                .name("정판매")
                .build());
        sellerId = seller.getMemberId();

        ProductGroup category = productGroupRepository.save(ProductGroup.builder()
                .groupType(GroupType.CATEGORY)
                .code("TEST_CATEGORY_3")
                .name("테스트카테고리3")
                .build());

        Product product = productRepository.save(Product.builder()
                .seller(seller)
                .category(category)
                .title("정산 계산 테스트 상품")
                .price(490_000)
                .shippingFee(4_000)
                .description("주문 서비스 테스트용 상품")
                .conditionCode(ProductCondition.S)
                .productStatus(ProductStatus.ON_SALE)
                .build());
        productId = product.getProductId();
    }

    @Test
    @DisplayName("createOrder 성공 → 수수료 2%·10원 반올림 정산 계산 정확 + 상품 SOLD + 주문 PAID")
    void createOrder_success_computesSettlement_andMarksSold() {
        OrderResponseDto res = orderService.createOrder("buyer_1", request());

        // (490,000 + 4,000) × 2% = 9,880  →  최종 503,880 / 정산 494,000
        assertThat(res.getProductPrice()).isEqualTo(490_000);
        assertThat(res.getShippingFee()).isEqualTo(4_000);
        assertThat(res.getCommission()).isEqualTo(2);                        // 수수료 "율"(%)
        assertThat(res.getFinalPrice()).isEqualTo(503_880);                  // 구매자 최종 결제액
        assertThat(res.getSellerSettlementAmount()).isEqualTo(494_000);      // 판매자 정산액
        assertThat(res.getFinalPrice() - res.getSellerSettlementAmount()).isEqualTo(9_880); // 수수료 금액
        assertThat(res.getOrderStatus()).isEqualTo("PAID");
        assertThat(res.getPaidAt()).isNotNull();

        assertThat(productRepository.findById(productId).orElseThrow().getProductStatus())
                .isEqualTo(ProductStatus.SOLD);
        assertThat(orderRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("createOrder — 본인 상품 구매(buyerId == sellerId)는 O004로 차단")
    void createOrder_selfOrder_isRejected() {
        CustomException ex = expectCustom(() -> orderService.createOrder(sellerId, request()));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SELF_ORDER_NOT_ALLOWED); // O004
    }

    @Test
    @DisplayName("createOrder — 이미 SOLD 상품은 P002로 차단하고 주문을 만들지 않음")
    void createOrder_alreadySold_isRejected() {
        productRepository.updateProductStatus(productId, ProductStatus.SOLD);

        CustomException ex = expectCustom(() -> orderService.createOrder("buyer_1", request()));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.PRODUCT_ALREADY_SOLD); // P002
        assertThat(orderRepository.count()).isZero();
    }

    @Test
    @DisplayName("confirmOrder — 판매자가 PAID 주문 접수 시 REQUESTED로 전이")
    void confirmOrder_bySeller_movesToRequested() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();

        OrderResponseDto res = orderService.confirmOrder(orderId, sellerId);

        assertThat(res.getOrderStatus()).isEqualTo("REQUESTED");
        assertThat(res.getRequestedAt()).isNotNull();
    }

    @Test
    @DisplayName("confirmOrder — 판매자가 아니면 O003으로 차단")
    void confirmOrder_byNonSeller_isRejected() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();

        CustomException ex = expectCustom(() -> orderService.confirmOrder(orderId, "someone_else"));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.ORDER_UNAUTHORIZED); // O003
    }

    @Test
    @DisplayName("cancelOrder — 구매자가 PAID 주문 취소 시 CANCELLED + 상품 ON_SALE 복구")
    void cancelOrder_byBuyer_restoresProduct() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();
        assertThat(productRepository.findById(productId).orElseThrow().getProductStatus())
                .isEqualTo(ProductStatus.SOLD);

        OrderResponseDto res = orderService.cancelOrder(orderId, "buyer_1");

        assertThat(res.getOrderStatus()).isEqualTo("CANCELLED");
        assertThat(productRepository.findById(productId).orElseThrow().getProductStatus())
                .isEqualTo(ProductStatus.ON_SALE); // 재판매 가능 상태로 복구
    }

    @Test
    @DisplayName("cancelOrder — 구매자 본인이 아니면 O003으로 차단")
    void cancelOrder_byNonBuyer_isRejected() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();

        CustomException ex = expectCustom(() -> orderService.cancelOrder(orderId, "buyer_2"));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.ORDER_UNAUTHORIZED); // O003
    }

    @Test
    @DisplayName("cancelOrder — REQUESTED(주문접수) 상태에서도 구매자 취소 가능")
    void cancelOrder_requestedStatus_isAllowed() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();
        orderService.confirmOrder(orderId, sellerId); // PAID → REQUESTED

        OrderResponseDto res = orderService.cancelOrder(orderId, "buyer_1");

        assertThat(res.getOrderStatus()).isEqualTo("CANCELLED");
        assertThat(productRepository.findById(productId).orElseThrow().getProductStatus())
                .isEqualTo(ProductStatus.ON_SALE);
    }

    @Test
    @DisplayName("cancelOrder — 이미 취소된 주문(CANCELLED)은 O002로 차단")
    void cancelOrder_alreadyCancelled_isRejected() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();
        orderService.cancelOrder(orderId, "buyer_1"); // PAID → CANCELLED

        CustomException ex = expectCustom(() -> orderService.cancelOrder(orderId, "buyer_1"));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.ORDER_INVALID_STATUS); // O002
    }

    @Test
    @DisplayName("getOrder — 주문 당사자(구매자/판매자)가 아니면 O003으로 차단")
    void getOrder_byOutsider_isRejected() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();

        CustomException ex = expectCustom(() -> orderService.getOrder(orderId, "outsider"));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.ORDER_UNAUTHORIZED); // O003
    }

    @Test
    @DisplayName("mockPay — 결제 금액 불일치 시 O007로 차단")
    void mockPay_amountMismatch_isRejected() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();

        CustomException ex = expectCustom(() -> orderService.mockPay(orderId, "buyer_1", 999));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.PAYMENT_AMOUNT_MISMATCH); // O007
    }

    @Test
    @DisplayName("mockPay — 접수 이후 단계로 진행된 주문은 O006(결제 완료)으로 차단")
    void mockPay_afterProgressed_isRejected() {
        String orderId = orderService.createOrder("buyer_1", request()).getOrderId();
        orderService.confirmOrder(orderId, sellerId); // PAID → REQUESTED

        CustomException ex = expectCustom(() -> orderService.mockPay(orderId, "buyer_1", 503_880));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.PAYMENT_ALREADY_COMPLETED); // O006
    }

    @Test
    @DisplayName("getOrder — 존재하지 않는 주문은 EntityNotFoundException")
    void getOrder_notFound() {
        assertThatThrownBy(() -> orderService.getOrder("NO_SUCH_ORDER", "buyer_1"))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── helpers ─────────────────────────────────────────────

    /** 주어진 실행이 CustomException 을 던지는지 확인하고 그 예외를 반환한다. */
    private CustomException expectCustom(Runnable action) {
        try {
            action.run();
        } catch (CustomException e) {
            return e;
        }
        throw new AssertionError("CustomException 이 발생해야 하는데 발생하지 않았습니다.");
    }

    private OrderRequestDto request() {
        ObjectMapper om = new ObjectMapper();
        om.setVisibility(PropertyAccessor.FIELD, Visibility.ANY);
        String json = """
                {
                  "productId": %d,
                  "receiverName": "정병묵",
                  "receiverPhone": "010-0000-0000",
                  "receiverZipcode": "06236",
                  "receiverAddress": "서울시 강남구 테헤란로 123",
                  "receiverAddressDetail": "101동 101호",
                  "deliveryRequest": "부재 시 경비실"
                }
                """.formatted(productId);
        try {
            return om.readValue(json, OrderRequestDto.class);
        } catch (Exception e) {
            throw new IllegalStateException("테스트 주문 요청 생성 실패", e);
        }
    }

    private void cleanUp() {
        orderRepository.deleteAll();
        productRepository.deleteAll();
        memberRepository.deleteAll();
        productGroupRepository.deleteAll();
    }
}
