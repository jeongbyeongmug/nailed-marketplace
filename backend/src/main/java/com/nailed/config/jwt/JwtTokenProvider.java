package com.nailed.config.jwt;

import com.nailed.web.member.entity.Member;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * JWT 토큰 생성 · 검증 · 파싱
 *
 * Access Token  : API 요청 시 Authorization 헤더에 담는 토큰 (유효기간 1시간)
 * Refresh Token : Access Token 만료 시 재발급용 토큰 (유효기간 7일, HttpOnly 쿠키)
 *
 * JWT Payload 클레임
 *   sub    : memberId (회원 PK)
 *   userid : 로그인 아이디
 *   role   : USER / ADMIN (Access Token에만 포함)
 *   type   : "access" | "refresh" — 토큰 종류 구분용
 */
@Component
public class JwtTokenProvider {

    private static final String TOKEN_TYPE = "Bearer";

    private final SecretKey secretKey;
    private final long accessTokenValidityMs;
    private final long refreshTokenValidityMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-validity-ms}") long accessTokenValidityMs,
            @Value("${jwt.refresh-token-validity-ms}") long refreshTokenValidityMs) {
        // 문자열 비밀키 → HMAC-SHA 서명 키 객체로 변환
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenValidityMs = accessTokenValidityMs;
        this.refreshTokenValidityMs = refreshTokenValidityMs;
    }

    // ── Access Token ───────────────────────────────────────────

    /** 토큰 문자열만 필요할 때 사용 */
    public String createAccessToken(Member member) {
        return createAccessTokenInfo(member).accessToken();
    }

    /** 토큰 문자열 + 만료 정보 반환 (로그인 응답에 사용) */
    public AccessTokenInfo createAccessTokenInfo(Member member) {
        Date now = new Date();
        Date expiresAt = calcExpiresAt(now, accessTokenValidityMs);

        String accessToken = Jwts.builder()
                .subject(member.getMemberId())
                .claim("userid", member.getUserid())
                .claim("role", member.getRole())
                .claim("type", "access")   // Refresh Token을 Access 자리에 쓰는 오용 방지
                .issuedAt(now)
                .expiration(expiresAt)
                .signWith(secretKey)
                .compact();

        return new AccessTokenInfo(
                accessToken,
                TOKEN_TYPE,
                accessTokenValidityMs / 1000,  // ms → 초 변환 (FE 전달용)
                toLocalDateTime(expiresAt)
        );
    }

    // ── Refresh Token ──────────────────────────────────────────

    /** Refresh Token 발급 — role 클레임 없음 (재발급 전용이므로 권한 정보 불필요) */
    public RefreshTokenInfo createRefreshTokenInfo(Member member) {
        Date now = new Date();
        Date expiresAt = calcExpiresAt(now, refreshTokenValidityMs);

        String refreshToken = Jwts.builder()
                .subject(member.getMemberId())
                .claim("userid", member.getUserid())
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiresAt)
                .signWith(secretKey)
                .compact();

        return new RefreshTokenInfo(
                refreshToken,
                refreshTokenValidityMs / 1000,
                toLocalDateTime(expiresAt)
        );
    }

    // ── 검증 ───────────────────────────────────────────────────

    /**
     * Access Token 검증
     * parseClaims() 내부에서 서명 위변조·만료를 자동 검사
     * 추가로 type="access" 여부 확인 → Refresh Token 오용 방지
     */
    public boolean validateAccessToken(String token) {
        return "access".equals(parseClaims(token).get("type", String.class));
    }

    /** Refresh Token 검증 — type="refresh" 확인 */
    public boolean validateRefreshToken(String token) {
        return "refresh".equals(parseClaims(token).get("type", String.class));
    }

    // ── 파싱 ───────────────────────────────────────────────────

    /** 토큰에서 memberId(subject) 추출 */
    public String getMemberId(String token) {
        return parseClaims(token).getSubject();
    }

    /** 토큰에서 role 추출 */
    public String getRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────

    /**
     * JWT 파싱 + 서명 검증
     * 서명 불일치·만료·형식 오류 시 JwtException 발생
     */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 만료 시각 계산
     * ms를 1000으로 나눈 뒤 다시 곱하는 이유: JWT 표준이 초 단위라
     * 밀리초 오차로 검증 실패하는 것을 방지
     */
    private Date calcExpiresAt(Date now, long validityMs) {
        long ms = now.getTime() + validityMs;
        return new Date((ms / 1000) * 1000);
    }

    /** Date → LocalDateTime 변환 (나노초 버림) */
    private LocalDateTime toLocalDateTime(Date date) {
        return LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault())
                .truncatedTo(ChronoUnit.SECONDS);
    }

    // ── 응답 레코드 ────────────────────────────────────────────
    // record = 불변 데이터 클래스 (Java 16+), getter·equals·toString 자동 생성

    public record AccessTokenInfo(
            String accessToken,
            String tokenType,
            long expiresIn,            // 유효기간 (초)
            LocalDateTime tokenExpiresAt
    ) {}

    public record RefreshTokenInfo(
            String refreshToken,
            long refreshExpiresIn,     // 유효기간 (초)
            LocalDateTime refreshTokenExpiresAt
    ) {}
}
