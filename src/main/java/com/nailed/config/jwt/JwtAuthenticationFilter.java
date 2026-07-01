package com.nailed.config.jwt;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * JWT 인증 필터 — 모든 HTTP 요청마다 1번 실행 (OncePerRequestFilter)
 *
 * 처리 흐름
 *   요청 도착 → 헤더에서 토큰 추출
 *     토큰 없음 → 다음 필터로 통과 (permitAll 경로는 Security 설정에서 허용)
 *     토큰 있음 → 검증
 *       유효 → SecurityContext에 인증 정보 등록 → 컨트롤러 실행
 *       무효 → 401 응답 반환
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // 1. Authorization 헤더에서 "Bearer " 제거 후 순수 토큰 추출
        String token = resolveToken(request);

        // 2. 토큰 없으면 인증 없이 통과 (비로그인 허용 경로)
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. 토큰 검증
        try {
            // 서명·만료·type="access" 모두 확인
            if (!jwtTokenProvider.validateAccessToken(token)) {
                throw new IllegalArgumentException("Access token required");
            }

            String memberId = jwtTokenProvider.getMemberId(token);
            String role     = jwtTokenProvider.getRole(token);

            // Spring Security 인증 객체 생성
            // principal = memberId → 컨트롤러에서 @AuthenticationPrincipal로 꺼낼 수 있음
            // authorities = ROLE_USER / ROLE_ADMIN → hasRole() 체크에 사용
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            memberId,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role)));

            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (JwtException | IllegalArgumentException e) {
            // 서명 불일치·만료·형식 오류 → 401, 필터 체인 중단
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
            return;
        }

        // 4. 인증 완료 → 다음 필터로
        filterChain.doFilter(request, response);
    }

    /**
     * Authorization 헤더에서 토큰 추출
     * "Bearer eyJ..." → "eyJ..." 반환, 헤더 없거나 형식 불일치 시 null
     */
    private String resolveToken(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authorization) || !authorization.startsWith(BEARER_PREFIX)) {
            return null;
        }
        return authorization.substring(BEARER_PREFIX.length());
    }
}
