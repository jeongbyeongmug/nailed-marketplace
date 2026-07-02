package com.nailed.web.product;

import lombok.RequiredArgsConstructor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import com.nailed.web.product.service.ProductService; // 패키지 경로에 맞게 자동 임포트

import java.util.concurrent.TimeUnit;

// @Lazy: 부팅 시 RedissonClient를 끌어와 Redis에 접속하지 않도록 지연 로딩한다.
@Component
@Lazy
@RequiredArgsConstructor
public class ProductLockFacade {

    private final RedissonClient redissonClient;
    private final ProductService productService; // 팀원 서비스 주입

    public void purchaseWithLock(Long productId, String userId) {
        // 상품 고유 ID 기반으로 Redis에 락 생성
        RLock lock = redissonClient.getLock("LOCK:PRODUCT:" + productId);

        try {
            // 5초 동안 락이 풀리기를 기다리고, 락을 얻으면 1초 동안 쥐고 있다가 자동 해제
            boolean available = lock.tryLock(5, 1, TimeUnit.SECONDS);

            if (!available) {
                throw new RuntimeException("락을 획득하지 못했습니다.");
            }

            // 락을 획득한 단 1명의 쓰레드만 방금 우리가 만든 가상 구매 로직을 실행함
            productService.testPurchaseProduct(productId, userId);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        } finally {
            // 로직이 끝나면 안전하게 락을 반환
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}