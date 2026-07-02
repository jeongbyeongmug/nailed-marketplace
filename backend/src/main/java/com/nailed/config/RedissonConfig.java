package com.nailed.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RedissonConfig {

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        // 로컬에서 실행할 Redis 기본 연결 주소 설정
        config.useSingleServer().setAddress("redis://localhost:6379");
        return Redisson.create(config);
    }
}