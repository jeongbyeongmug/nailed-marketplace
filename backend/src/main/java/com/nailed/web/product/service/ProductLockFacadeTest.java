package com.nailed.web.product.service;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

import com.nailed.common.enums.GroupType;
import com.nailed.common.enums.ProductCondition;
import com.nailed.common.enums.ProductStatus;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.product.ProductLockFacade;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.entity.ProductGroup;
import com.nailed.web.product.repository.ProductGroupRepository;
import com.nailed.web.product.repository.ProductRepository;

import jakarta.persistence.EntityManager;

// @Lazy: 부팅 시 ProductLockFacade→RedissonClient 체인을 끌어오지 않도록 지연 로딩한다.
@Component
@Lazy
public class ProductLockFacadeTest {

    private final ProductLockFacade productLockFacade;
    private final ProductRepository productRepository;
    private final ProductGroupRepository productGroupRepository;
    private final MemberRepository memberRepository;

    @Autowired
    private EntityManager em;

    public ProductLockFacadeTest(ProductLockFacade productLockFacade,
                                 ProductRepository productRepository,
                                 ProductGroupRepository productGroupRepository,
                                 MemberRepository memberRepository) {
        this.productLockFacade = productLockFacade;
        this.productRepository = productRepository;
        this.productGroupRepository = productGroupRepository;
        this.memberRepository = memberRepository;
    }

    public void runConcurrencyTest() {
        System.out.println("====== [분산 락 동시성 테스트 시작] ======");

        // ─── [필수 연관관계/NOT NULL 필드를 채운 안전한 빌더 패턴] ───
        // products 테이블은 seller_id, category_id, description, condition_code 가 모두 NOT NULL 이므로
        // DB에 이미 존재하는 회원/카테고리를 하나씩 가져와 붙여준다.
        List<ProductGroup> categories = productGroupRepository.findByGroupTypeWithParent(GroupType.CATEGORY);
        if (categories.isEmpty()) {
            throw new IllegalStateException("테스트용 카테고리가 없습니다. product_groups에 CATEGORY 데이터를 먼저 넣어주세요.");
        }
        ProductGroup category = categories.get(0);

        Member seller = memberRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "테스트용 회원이 없습니다. members에 회원 데이터를 먼저 넣어주세요."));

        Product testProduct = Product.builder()
                .seller(seller)                       // NOT NULL
                .category(category)                   // NOT NULL
                .title("분산락 테스트 상품")
                .price(10000)
                .shippingFee(0)
                .description("분산 락 동시성 테스트용 상품입니다.")   // NOT NULL
                .conditionCode(ProductCondition.S)                  // NOT NULL
                .productStatus(ProductStatus.ON_SALE)               // 판매 중 상태로 생성
                .build();

        Product savedProduct = productRepository.save(testProduct);
        Long targetProductId = savedProduct.getProductId();
        // ─── [수정 끝] ───

        int threadCount = 10;
        ExecutorService executorService = Executors.newFixedThreadPool(5);
        CountDownLatch latch = new CountDownLatch(threadCount);

        for (int i = 0; i < threadCount; i++) {
            String buyerId = "user_" + i;
            executorService.submit(() -> {
                try {
                    productLockFacade.purchaseWithLock(targetProductId, buyerId);
                } catch (Exception e) {
                    System.out.println("구매 실패 유저 발생 -> " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }

        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // 캐시 비우기 (메인 쓰레드가 DB의 변경사항을 새로 긁어오도록 강제)
        em.clear();

        Product updatedProduct = productRepository.findById(targetProductId).orElseThrow();

        System.out.println("=========================================");
        System.out.println("최종 상품 상태 결과: " + updatedProduct.getProductStatus());

        if (updatedProduct.getProductStatus() == ProductStatus.SOLD) {
            System.out.println("[테스트 결과] ★★★ 분산 락 동시성 테스트 대성공! (초록불과 동일) ★★★");
        } else {
            System.out.println("[테스트 결과] 동시성 제어 실패 (데이터 정합성 깨짐)");
        }
        System.out.println("=========================================");
    }
}
