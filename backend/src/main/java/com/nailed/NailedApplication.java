package com.nailed;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing   // BaseEntity / CreatedOnlyEntity 의 created_at, updated_at 자동 관리
@EnableScheduling    // @Scheduled 사용 (인기 상품 집계 등)
public class NailedApplication {
    public static void main(String[] args) {
        SpringApplication.run(NailedApplication.class, args);
    }
}
