package com.nailed.observability;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 관측성(Observability) 엔드포인트 검증.
 *
 * <p>운영 모니터링을 위해 Spring Boot Actuator 를 붙이고, 컨테이너·로드밸런서의 헬스체크용
 * {@code /actuator/health} 와 Micrometer 메트릭 조회용 {@code /actuator/metrics} 가 인증 없이
 * 열려 정상 응답하는지 실제 내장 톰캣(RANDOM_PORT)에 HTTP 요청을 보내 확인한다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("관측성 - Actuator health / metrics 엔드포인트")
class ActuatorEndpointsTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("/actuator/health 는 200 + status:UP (DB 포함) 를 반환한다")
    void health_isUp() {
        ResponseEntity<String> res = restTemplate.getForEntity("/actuator/health", String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("/actuator/metrics 는 200 + JVM 메트릭 이름을 노출한다")
    void metrics_exposeMeterNames() {
        ResponseEntity<String> res = restTemplate.getForEntity("/actuator/metrics", String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("jvm.memory.used"); // Micrometer가 수집하는 표준 메트릭
    }
}
