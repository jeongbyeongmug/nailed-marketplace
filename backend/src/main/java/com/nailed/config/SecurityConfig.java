package com.nailed.config;

import com.nailed.config.jwt.JwtAuthenticationFilter;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Spring Security 전역 설정
 * JWT Stateless 방식 사용 — 서버가 세션을 저장하지 않고 토큰으로만 인증
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .httpBasic(AbstractHttpConfigurer::disable)  // HTTP Basic 인증 미사용
                .formLogin(AbstractHttpConfigurer::disable)  // 폼 로그인 미사용 (직접 API 구현)
                .logout(AbstractHttpConfigurer::disable)     // 기본 로그아웃 미사용 (직접 구현)
                .csrf(AbstractHttpConfigurer::disable)       // Stateless API → CSRF 위험 없음
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // 세션 미사용
                .authorizeHttpRequests(auth -> auth
                        // 브라우저 CORS 사전 확인(Preflight) 요청 — 반드시 허용
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // 모니터링/헬스체크(LB·Prometheus 스크레이핑용) — 운영에선 prometheus는 내부망으로 제한 권장
                        .requestMatchers("/actuator/**").permitAll()
                        // 비로그인 허용 경로
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/users/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/products/*/view").permitAll()
                        .requestMatchers("/uploads/**", "/images/**").permitAll()
                        .requestMatchers("/api/orders/**").permitAll()
                        // 어드민 전용 (ROLE_ADMIN 필요)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // 나머지 모두 로그인 필요
                        .anyRequest().authenticated())
                // JWT 필터를 기본 인증 필터 앞에 등록
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * 비밀번호 BCrypt 암호화
     * encode()로 저장, matches()로 로그인 시 비교
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * CORS 설정 — FE(localhost:5173)에서 BE(localhost:8080) 호출 허용
     *
     * allowCredentials(true) 필요 이유:
     *   refreshToken HttpOnly 쿠키를 요청에 포함하려면 반드시 true
     *   단, allowedOrigins에 "*" 사용 불가 → 출처를 명시해야 함
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // 운영 환경에서는 실제 도메인으로 교체
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://13.125.205.120",
                "http://15.134.228.33",
                "http://52.78.146.81"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*")); // Authorization 헤더 포함
        config.setAllowCredentials(true);       // 쿠키 포함 요청 허용 (FE의 withCredentials: true 와 쌍)

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
