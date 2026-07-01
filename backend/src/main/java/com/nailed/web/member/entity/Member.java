package com.nailed.web.member.entity;

import com.nailed.common.entity.BaseEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

/**
 * 회원 엔티티 (최소 정의)
 * - Product / Report / Review 에서 FK 참조 및 판매자 정보 표시에 사용
 * - 전체 회원 기능(가입·로그인·탈퇴 등)은 member 도메인 구현 시 확장 예정
 */
@Entity
@Table(name = "members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Member extends BaseEntity {

    @Id
    @Column(name = "member_id", length = 20)
    private String memberId;

    @Column(name = "userid", length = 50, nullable = false, unique = true)
    private String userid;

    @Column(name = "password_hash", length = 255, nullable = false)
    private String passwordHash;

    @Column(name = "nickname", length = 30, nullable = false, unique = true)
    private String nickname;

    @Column(name = "name", length = 30, nullable = false)
    private String name;

    @Column(name = "shop_info", length = 80)
    private String shopInfo;

    // 계정 상태 (ACTIVE / LOCKED / WITHDRAWN / SUSPEND / BANNED)
    @Column(name = "member_status", length = 20, nullable = false)
    @Builder.Default
    private String memberStatus = "ACTIVE";

    // 판매자 등급 (BRONZE / SILVER / GOLD / DIAMOND)
    @Column(name = "seller_grade", length = 20, nullable = false)
    @Builder.Default
    private String sellerGrade = "BRONZE";

    // 권한 (USER / ADMIN)
    @Column(name = "role", length = 20, nullable = false)
    @Builder.Default
    private String role = "USER";

    @Column(name = "marketing_agreed", nullable = false, columnDefinition = "TINYINT(1)")
    @Builder.Default
    private boolean marketingAgreed = false;

    @Column(name = "refresh_token", length = 500)
    private String refreshToken;

    @Column(name = "refresh_token_expires_at")
    private LocalDateTime refreshTokenExpiresAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "login_fail_count", nullable = false)
    @Builder.Default
    private int loginFailCount = 0;

    @Column(name = "login_fail_started_at")
    private LocalDateTime loginFailStartedAt;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "login_count", nullable = false)
    @Builder.Default
    private int loginCount = 0;

    public void changePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void updateRefreshToken(String refreshToken, LocalDateTime refreshTokenExpiresAt) {
        this.refreshToken = refreshToken;
        this.refreshTokenExpiresAt = refreshTokenExpiresAt;
    }

    public void clearRefreshToken() {
        this.refreshToken = null;
        this.refreshTokenExpiresAt = null;
    }

    public void recordLoginFailure(LocalDateTime loginFailStartedAt, int loginFailCount) {
        this.loginFailStartedAt = loginFailStartedAt;
        this.loginFailCount = loginFailCount;
    }

    public void resetLoginFailures() {
        this.loginFailCount = 0;
        this.loginFailStartedAt = null;
        this.lockedUntil = null;
    }

    public void increaseLoginCount() {
        this.loginCount++;
    }

    public void updateLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public void lockUntil(LocalDateTime lockedUntil) {
        this.memberStatus = "LOCKED";
        this.lockedUntil = lockedUntil;
        this.loginFailCount = 0;
        this.loginFailStartedAt = null;
    }

    public void unlock() {
        this.memberStatus = "ACTIVE";
        this.lockedUntil = null;
        this.loginFailCount = 0;
        this.loginFailStartedAt = null;
    }

    public void suspendUntil(LocalDateTime endsAt) {
        this.memberStatus = "SUSPEND";
        this.lockedUntil = endsAt;
    }

    public void unsuspend() {
        this.memberStatus = "ACTIVE";
        this.lockedUntil = null;
    }

    public void ban() {
        this.memberStatus = "BANNED";
        this.lockedUntil = null;
    }
}
