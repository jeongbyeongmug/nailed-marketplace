package com.nailed.web.auth.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.config.jwt.JwtTokenProvider;
import com.nailed.web.auth.dto.AuthRequest;
import com.nailed.web.auth.dto.AuthResponse;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;

/**
 * 회원 인증 서비스
 * 클래스 레벨 readOnly=true: 기본이 조회용, 변경 메서드에만 @Transactional 재선언
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    // 혼동 문자(0, O, 1, I, l) 제외한 임시 비밀번호 문자셋
    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 10;

    // 로그인 실패 정책: 30분 내 5회 실패 시 10분 잠금
    private static final int LOGIN_FAIL_LIMIT          = 5;
    private static final int LOGIN_FAIL_WINDOW_MINUTES = 30;
    private static final int LOGIN_LOCK_MINUTES        = 10;

    // SecureRandom: 암호학적으로 안전한 난수 (임시 비밀번호 생성용)
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // 관리자 사칭 방지 — 아이디·닉네임·이름에 아래 키워드 포함 시 가입 불가
    private static final List<String> ADMIN_RESERVED_KEYWORDS = List.of(
        "관리자", "관리원", "관리팀", "관리부",
        "admin", "administrator", "superadmin", "sysadmin", "어드민", "어드미니스트레이터",
        "MEMBER_000",
        "운영자", "운영팀", "운영진", "운영부", "운영원",
        "operator", "manager", "moderator", "오퍼레이터", "매니저", "모더레이터",
        "nailed", "네일드", "네일", "nailedadmin", "nailedofficial",
        "공식", "official", "공식계정", "공식운영",
        "시스템", "system", "고객센터", "고객지원", "support",
        "staff", "스태프", "master", "마스터", "root", "루트",
        "총괄", "총관리", "책임자", "대표", "대표자", "임원", "직원", "bot", "봇"
    );

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    // ── 중복 확인 ───────────────────────────────────────────────

    @Override
	public AuthResponse.DuplicateCheck checkUserid(String userid) {
        return new AuthResponse.DuplicateCheck(
                memberRepository.existsByUserid(normalizeUserid(userid)));
    }

    @Override
	public AuthResponse.DuplicateCheck checkNickname(String nickname) {
        return new AuthResponse.DuplicateCheck(
                memberRepository.existsByNickname(nickname));
    }

    // ── 회원가입 ────────────────────────────────────────────────

    @Override
	@Transactional
    public AuthResponse.Signup signup(AuthRequest.Signup request) {
        String userid = normalizeUserid(request.userid());

        validateNotAdminKeyword(userid);
        validateNotAdminKeyword(request.nickname());
        validateNotAdminKeyword(request.name());

        if (memberRepository.existsByUserid(userid))
            throw new CustomException(ErrorCode.MEMBER_ALREADY_EXISTS);
        if (memberRepository.existsByNickname(request.nickname()))
            throw new CustomException(ErrorCode.NICKNAME_DUPLICATED);

        Member member = Member.builder()
                .memberId(generateMemberId())
                .userid(userid)
                .passwordHash(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .name(request.name())
                .role("USER")
                .marketingAgreed(request.marketingAgreed())
                .build();

        return AuthResponse.Signup.from(memberRepository.save(member));
    }

    // ── 로그인 ──────────────────────────────────────────────────

    /**
     * noRollbackFor 이유: 로그인 실패 시 실패 횟수를 DB에 저장해야 하는데
     * CustomException 발생으로 롤백되면 카운트가 저장 안 됨
     */
    @Override
	@Transactional(noRollbackFor = CustomException.class)
    public AuthResponse.Login login(AuthRequest.Login request, HttpServletResponse response) {
        String userid = normalizeUserid(request.userid());
        Member member = memberRepository.findByUserid(userid)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_LOGIN));

        LocalDateTime now = LocalDateTime.now();

        handleExpiredLoginRestriction(member, now);
        validateMemberStatus(member);
        resetExpiredLoginFailureWindow(member, now);

        if (!verifyPassword(request.password(), member.getPasswordHash())) {
            recordLoginFailure(member, now);
            throw new CustomException(ErrorCode.INVALID_LOGIN);
        }

        member.resetLoginFailures();
        member.increaseLoginCount();
        member.updateLastLoginAt(now);

        JwtTokenProvider.AccessTokenInfo accessTokenInfo  = jwtTokenProvider.createAccessTokenInfo(member);
        JwtTokenProvider.RefreshTokenInfo refreshTokenInfo = jwtTokenProvider.createRefreshTokenInfo(member);

        member.updateRefreshToken(refreshTokenInfo.refreshToken(), refreshTokenInfo.refreshTokenExpiresAt());
        memberRepository.save(member);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshTokenInfo.refreshToken())
                .httpOnly(true).sameSite("Lax").secure(false).path("/").maxAge(Duration.ofDays(7))
                .build();
        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return AuthResponse.Login.from(member, accessTokenInfo, null);
    }

    // ── Access Token 재발급 ─────────────────────────────────────

    @Override
	public AuthResponse.TokenRefresh refreshAccessToken(String refreshToken) {
        String normalized = normalizeToken(refreshToken);
        if (normalized.isBlank()) throw new CustomException(ErrorCode.INVALID_TOKEN);

        Member member = memberRepository.findByRefreshToken(normalized)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_TOKEN));

        if (!normalized.equals(member.getRefreshToken()))
            throw new CustomException(ErrorCode.INVALID_TOKEN);

        if (member.getRefreshTokenExpiresAt() == null
                || !member.getRefreshTokenExpiresAt().isAfter(LocalDateTime.now()))
            throw new CustomException(ErrorCode.TOKEN_EXPIRED);

        validateRefreshTokenFormat(normalized);
        validateMemberStatus(member);

        return AuthResponse.TokenRefresh.from(member, jwtTokenProvider.createAccessTokenInfo(member));
    }

    // ── 로그아웃 ────────────────────────────────────────────────

    @Override
	@Transactional
    public AuthResponse.SimpleResult logout(String refreshToken, HttpServletResponse response) {
        String normalized = normalizeToken(refreshToken);
        if (!normalized.isBlank()) {
            memberRepository.findByRefreshToken(normalized).ifPresent(Member::clearRefreshToken);
        }

        ResponseCookie deleteCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true).sameSite("Lax").secure(false).path("/").maxAge(0).build();
        response.setHeader(HttpHeaders.SET_COOKIE, deleteCookie.toString());

        return new AuthResponse.SimpleResult(true);
    }

    // ── 임시 비밀번호 발급 ──────────────────────────────────────

    @Override
	@Transactional
    public AuthResponse.PasswordReset requestPasswordReset(AuthRequest.PasswordResetRequest request) {
        Member member = memberRepository.findByUserid(normalizeUserid(request.userid()))
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        String temporaryPassword = generateTemporaryPassword();
        member.changePasswordHash(passwordEncoder.encode(temporaryPassword));

        return new AuthResponse.PasswordReset(temporaryPassword);
    }

    // ── 내부 헬퍼 ───────────────────────────────────────────────

    private String generateMemberId() {
        String memberId;
        do { memberId = "M" + System.currentTimeMillis(); }
        while (memberRepository.existsById(memberId));
        return memberId;
    }

    private String normalizeUserid(String userid) { return userid == null ? "" : userid.trim(); }
    private String normalizeToken(String token)    { return token  == null ? "" : token.trim();  }

    private void validateRefreshTokenFormat(String refreshToken) {
        try {
            if (!jwtTokenProvider.validateRefreshToken(refreshToken))
                throw new CustomException(ErrorCode.INVALID_TOKEN);
        } catch (JwtException | IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
    }

    private String generateTemporaryPassword() {
        StringBuilder sb = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++)
            sb.append(TEMP_PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        return sb.toString();
    }

    /** BCrypt 해시 비교만 수행 */
    private boolean verifyPassword(String rawPassword, String storedPassword) {
        return passwordEncoder.matches(rawPassword, storedPassword);
    }

    private void handleExpiredLoginRestriction(Member member, LocalDateTime now) {
        String status = member.getMemberStatus();
        if (!"LOCKED".equals(status) && !"SUSPEND".equals(status) && !"SUSPENDED".equals(status)) return;

        LocalDateTime lockedUntil = member.getLockedUntil();

        if (lockedUntil == null && !"LOCKED".equals(status))
            throw new CustomException(ErrorCode.MEMBER_SUSPENDED);

        if (lockedUntil != null && lockedUntil.isAfter(now)) {
            throw new CustomException("LOCKED".equals(status)
                    ? ErrorCode.MEMBER_LOCKED : ErrorCode.MEMBER_SUSPENDED);
        }

        member.unlock();
    }

    private void resetExpiredLoginFailureWindow(Member member, LocalDateTime now) {
        LocalDateTime startedAt = member.getLoginFailStartedAt();
        if (startedAt != null && !startedAt.plusMinutes(LOGIN_FAIL_WINDOW_MINUTES).isAfter(now))
            member.resetLoginFailures();
    }

    private void recordLoginFailure(Member member, LocalDateTime now) {
        LocalDateTime startedAt = member.getLoginFailStartedAt();

        if (startedAt == null || !startedAt.plusMinutes(LOGIN_FAIL_WINDOW_MINUTES).isAfter(now)) {
            member.recordLoginFailure(now, 1);
            return;
        }

        int failCount = member.getLoginFailCount() + 1;
        if (failCount >= LOGIN_FAIL_LIMIT) {
            member.lockUntil(now.plusMinutes(LOGIN_LOCK_MINUTES));
            throw new CustomException(ErrorCode.MEMBER_LOCKED);
        }

        member.recordLoginFailure(startedAt, failCount);
    }

    private void validateMemberStatus(Member member) {
        String status = member.getMemberStatus();
        if ("WITHDRAWN".equals(status))                              throw new CustomException(ErrorCode.MEMBER_WITHDRAWN);
        if ("SUSPEND".equals(status) || "SUSPENDED".equals(status)) throw new CustomException(ErrorCode.MEMBER_SUSPENDED);
        if ("BANNED".equals(status))                                 throw new CustomException(ErrorCode.MEMBER_BANNED);
        if ("LOCKED".equals(status))                                 throw new CustomException(ErrorCode.MEMBER_LOCKED);
    }

    private void validateNotAdminKeyword(String value) {
        if (value == null) return;
        String normalized = value.toLowerCase().replaceAll("\\s", "");
        for (String keyword : ADMIN_RESERVED_KEYWORDS)
            if (normalized.contains(keyword.toLowerCase().replaceAll("\\s", "")))
                throw new CustomException(ErrorCode.FORBIDDEN);
    }
}