package com.nailed;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.nailed.web.product.service.ProductLockFacadeTest;

@SpringBootApplication
@EnableJpaAuditing   // BaseEntity / CreatedOnlyEntity 의 created_at, updated_at 자동 관리
@EnableScheduling    // @Scheduled 사용 (인기 상품 집계 등)
public class NailedApplication {
    public static void main(String[] args) {
        SpringApplication.run(NailedApplication.class, args);
    }

    // ── [분산 락 테스트 구동기] ──
    // 서버가 정상적으로 켜진 직후, 자동으로 ProductLockFacadeTest의 테스트 메서드를 호출합니다.
    @Bean
    public CommandLineRunner testRunner(ProductLockFacadeTest productLockFacadeTest) {
        return args -> {
            productLockFacadeTest.runConcurrencyTest();
        };
    }
}