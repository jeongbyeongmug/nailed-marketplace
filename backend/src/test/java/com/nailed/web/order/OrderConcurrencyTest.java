package com.nailed.web.order;

import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nailed.common.enums.GroupType;
import com.nailed.common.enums.ProductCondition;
import com.nailed.common.enums.ProductStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.order.dto.OrderRequestDto;
import com.nailed.web.order.repository.OrderRepository;
import com.nailed.web.order.service.OrderService;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.entity.ProductGroup;
import com.nailed.web.product.repository.ProductGroupRepository;
import com.nailed.web.product.repository.ProductRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 주문 동시성 통합 테스트.
 *
 * <p>중고거래 특성상 상품 재고는 1개다. 동일 상품에 여러 구매 요청이 "동시에" 몰릴 때
 * {@link OrderService#createOrder} 의 비관적 락(2중 방어)이 실제로 중복 주문을 막는지를
 * 실제 MySQL + 실제 멀티스레드 환경에서 검증한다.
 *
 * <ul>
 *   <li>1차 방어 — 락 대기 타임아웃 시 {@code PessimisticLockingFailureException}
 *       → 커스텀 에러코드 {@code O012}(409 Conflict)</li>
 *   <li>2차 방어 — 락 획득 후 상품이 이미 {@code SOLD}면 차단
 *       → 커스텀 에러코드 {@code P002}(400 Bad Request)</li>
 * </ul>
 *
 * <p>기대 결과: N개의 동시 요청 중 <b>정확히 1건만 성공</b>, 나머지는 모두 차단되고
 * 상품은 {@code SOLD} 로 확정되며 주문 레코드도 1건만 생성된다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("주문 동시성 - 재고 1개 상품에 동시 구매가 몰려도 1건만 성공")
class OrderConcurrencyTest {

    private static final int CONCURRENT_REQUESTS = 30;

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
                .memberId("SELLER0000000000001")
                .userid("seller01")
                .passwordHash("hashed-password")
                .nickname("판매자01")
                .name("정판매")
                .build());
        sellerId = seller.getMemberId();

        ProductGroup category = productGroupRepository.save(ProductGroup.builder()
                .groupType(GroupType.CATEGORY)
                .code("TEST_CATEGORY")
                .name("테스트카테고리")
                .build());

        Product product = productRepository.save(Product.builder()
                .seller(seller)
                .category(category)
                .title("재고 1개 한정 상품")
                .price(490_000)
                .shippingFee(4_000)
                .description("동시성 테스트용 상품 (재고 1개)")
                .conditionCode(ProductCondition.S)
                .productStatus(ProductStatus.ON_SALE)
                .build());
        productId = product.getProductId();
    }

    @AfterEach
    void tearDown() {
        cleanUp();
    }

    @Test
    @DisplayName("동시 30건 주문 요청 → 1건 성공 / 29건 차단(O012·P002) / 상품 SOLD / 주문 1건")
    void concurrentOrders_onlyOneSucceeds() throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(CONCURRENT_REQUESTS);
        CountDownLatch ready = new CountDownLatch(CONCURRENT_REQUESTS); // 모든 스레드 준비 완료 대기
        CountDownLatch start = new CountDownLatch(1);                   // 동시 출발 신호
        CountDownLatch done = new CountDownLatch(CONCURRENT_REQUESTS);  // 전원 종료 대기

        AtomicInteger successCount = new AtomicInteger();
        Map<String, AtomicInteger> blockedByCode = new ConcurrentHashMap<>();

        OrderRequestDto request = buildOrderRequest(productId);

        for (int i = 0; i < CONCURRENT_REQUESTS; i++) {
            final String buyerId = "buyer_" + i;
            pool.submit(() -> {
                ready.countDown();
                try {
                    start.await();                                     // 전 스레드가 동시에 진입
                    orderService.createOrder(buyerId, request);
                    successCount.incrementAndGet();
                } catch (CustomException e) {
                    countBlocked(blockedByCode, e.getErrorCode().getCode());
                } catch (Exception e) {
                    countBlocked(blockedByCode, "OTHER:" + e.getClass().getSimpleName());
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await();
        start.countDown();                                             // 동시 발사
        boolean finished = done.await(60, TimeUnit.SECONDS);
        pool.shutdownNow();

        int blockedTotal = blockedByCode.values().stream().mapToInt(AtomicInteger::get).sum();
        ProductStatus finalStatus = productRepository.findById(productId).orElseThrow().getProductStatus();
        long orderRows = orderRepository.count();

        System.out.println("\n================ 주문 동시성 테스트 결과 ================");
        System.out.println("동시 요청 수      : " + CONCURRENT_REQUESTS);
        System.out.println("주문 성공         : " + successCount.get());
        System.out.println("주문 차단(실패)   : " + blockedTotal);
        System.out.println("차단 에러코드 분포 : " + blockedByCode);
        System.out.println("최종 상품 상태    : " + finalStatus);
        System.out.println("생성된 주문 레코드 : " + orderRows);
        System.out.println("========================================================\n");

        assertThat(finished).as("모든 스레드가 제한 시간 내 종료").isTrue();
        assertThat(successCount.get()).as("성공 주문은 정확히 1건").isEqualTo(1);
        assertThat(blockedTotal).as("나머지는 모두 차단").isEqualTo(CONCURRENT_REQUESTS - 1);
        assertThat(orderRows).as("주문 레코드도 1건만 생성").isEqualTo(1);
        assertThat(finalStatus).as("상품은 SOLD 로 확정").isEqualTo(ProductStatus.SOLD);
    }

    private static void countBlocked(Map<String, AtomicInteger> map, String code) {
        map.computeIfAbsent(code, k -> new AtomicInteger()).incrementAndGet();
    }

    /**
     * {@link OrderRequestDto} 는 setter/빌더가 없어(운영 코드는 Jackson 역직렬화로 채움)
     * 테스트에서도 동일하게 Jackson 으로 생성한다. 필드 직접 접근을 허용해 안전하게 매핑한다.
     */
    private OrderRequestDto buildOrderRequest(Long productId) {
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
                  "deliveryRequest": "부재 시 경비실에 맡겨주세요"
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
