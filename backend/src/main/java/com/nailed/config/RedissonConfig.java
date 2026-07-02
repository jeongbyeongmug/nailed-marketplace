package com.nailed.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

@Configuration
public class RedissonConfig {

    // @Lazy: 부팅 시점이 아니라 실제로 락이 처음 호출될 때 Redis에 접속한다.
    // → Redis가 없는 환경에서도 앱 부팅 자체는 성공한다.
    @Bean
    @Lazy
    public RedissonClient redissonClient() {
        Config config = new Config();
        // 로컬에서 실행할 Redis 기본 연결 주소 설정
        config.useSingleServer().setAddress("redis://localhost:6379");
        return Redisson.create(config);
    }
}