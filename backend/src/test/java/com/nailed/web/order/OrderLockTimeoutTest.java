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
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 비관적 락 <b>1차 방어(O012)</b> 검증.
 *
 * <p>{@link OrderConcurrencyTest} 는 승자 트랜잭션이 ms 단위로 끝나 뒤 요청이 2차 방어(P002)로
 * 걸리는 경로를 검증한다. 반면 실제 운영에서 승자가 락을 오래 쥐고 있으면, 뒤 요청은 락을
 * 잡지 못하고 <b>Lock wait timeout(MySQL 1205)</b> → {@code PessimisticLockingFailureException}
 * → 커스텀 에러코드 {@code O012}(<b>409 Conflict</b>) 로 즉시 차단된다.
 *
 * <p>이 테스트는 그 1차 방어 경로를 결정적으로 재현한다:
 * <ol>
 *   <li>별도 스레드가 상품 행을 {@code SELECT ... FOR UPDATE}로 점유한 채 대기</li>
 *   <li>락 대기 타임아웃을 2초로 낮춘 상태에서(아래 {@code connection-init-sql}) 주문 요청</li>
 *   <li>뒤 요청은 기본 50초를 기다리지 않고 2초 만에 {@code O012}(409)로 차단</li>
 *   <li>주문은 생성되지 않고 상품은 {@code ON_SALE} 그대로 유지</li>
 * </ol>
 */
@SpringBootTest
@ActiveProfiles("test")
// 이 테스트 컨텍스트의 모든 커넥션은 락 대기 타임아웃을 2초로 낮춘다.
// (운영 기본값 50초를 그대로 기다리면 테스트가 느려지므로, 1차 방어 경로만 빠르게 재현)
@TestPropertySource(properties =
        "spring.datasource.hikari.connection-init-sql=SET SESSION innodb_lock_wait_timeout = 2")
@DisplayName("주문 동시성 - 락 점유 중 뒤 요청은 O012(409)로 대기 없이 차단")
class OrderLockTimeoutTest {

    @Autowired private OrderService orderService;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private ProductGroupRepository productGroupRepository;
    @Autowired private PlatformTransactionManager txManager;

    private Long productId;
    private String sellerId;

    @BeforeEach
    void setUp() {
        cleanUp();

        Member seller = memberRepository.save(Member.builder()
                .memberId("SELLER0000000000002")
                .userid("seller02")
                .passwordHash("hashed-password")
                .nickname("판매자02")
                .name("정판매")
                .build());
        sellerId = seller.getMemberId();

        ProductGroup category = productGroupRepository.save(ProductGroup.builder()
                .groupType(GroupType.CATEGORY)
                .code("TEST_CATEGORY_2")
                .name("테스트카테고리2")
                .build());

        Product product = productRepository.save(Product.builder()
                .seller(seller)
                .category(category)
                .title("락 점유 테스트 상품")
                .price(490_000)
                .shippingFee(4_000)
                .description("락 대기 타임아웃(O012) 테스트용 상품")
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
    @DisplayName("상품 행이 FOR UPDATE 로 점유된 상태 → 주문 요청은 2초 내 O012(409) / 주문 0건 / 상품 ON_SALE")
    void heldLock_makesWaiterFailWithO012() throws InterruptedException {
        CountDownLatch locked = new CountDownLatch(1);   // 홀더가 락을 잡았음을 알림
        CountDownLatch release = new CountDownLatch(1);  // 홀더 락 해제 신호
        TransactionTemplate tx = new TransactionTemplate(txManager);

        // ── 홀더 스레드: 상품 행을 FOR UPDATE 로 점유한 채 대기 ──
        Thread holder = new Thread(() -> tx.executeWithoutResult(status -> {
            productRepository.findByIdWithLock(productId); // 상품 행에 쓰기 락 선점
            locked.countDown();
            try {
                release.await(10, TimeUnit.SECONDS);       // 대기 요청이 타임아웃 날 때까지 락 유지
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }), "lock-holder");
        holder.start();

        assertThat(locked.await(5, TimeUnit.SECONDS)).as("홀더가 락을 확보").isTrue();

        // ── 대기 요청: 락을 못 잡고 타임아웃 → O012 ──
        CustomException thrown = null;
        long startedAt = System.currentTimeMillis();
        try {
            orderService.createOrder("buyer_waiter", sellerId, buildOrderRequest(productId));
        } catch (CustomException e) {
            thrown = e;
        }
        long waitedMs = System.currentTimeMillis() - startedAt;

        release.countDown();
        holder.join();

        long orderRows = orderRepository.count();
        ProductStatus finalStatus = productRepository.findById(productId).orElseThrow().getProductStatus();

        System.out.println("\n============ 락 대기 타임아웃(1차 방어) 테스트 결과 ============");
        System.out.println("반환 에러코드     : " + (thrown == null ? "없음(성공)" : thrown.getErrorCode().getCode()));
        System.out.println("HTTP 상태         : " + (thrown == null ? "-" : thrown.getErrorCode().getHttpStatus().value()));
        System.out.println("대기 시간(ms)     : " + waitedMs + "  (기본 50000ms 아님)");
        System.out.println("생성된 주문 레코드 : " + orderRows);
        System.out.println("최종 상품 상태    : " + finalStatus);
        System.out.println("=============================================================\n");

        assertThat(thrown).as("대기 요청은 차단되어야 함").isNotNull();
        assertThat(thrown.getErrorCode()).as("1차 방어 O012").isEqualTo(ErrorCode.LOCK_ACQUISITION_FAILED);
        assertThat(thrown.getErrorCode().getHttpStatus()).as("409 Conflict").isEqualTo(HttpStatus.CONFLICT);
        assertThat(waitedMs).as("기본 50초가 아니라 낮춘 타임아웃(2초)에 걸림").isLessThan(10_000L);
        assertThat(orderRows).as("주문은 생성되지 않음").isZero();
        assertThat(finalStatus).as("상품은 판매중 유지").isEqualTo(ProductStatus.ON_SALE);
    }

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
