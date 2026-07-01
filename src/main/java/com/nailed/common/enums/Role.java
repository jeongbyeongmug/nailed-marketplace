package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 회원 권한 구분
 * DB: members.role VARCHAR(20) DEFAULT 'USER'
 * 주석값: USER/ADMIN
 *
 * 주의: Spring Security 권한명에는 "ROLE_" 접두사가 필요하므로
 *      권한 부여 시 getAuthority() 사용 (예: ROLE_USER, ROLE_ADMIN)
 */
@Getter
@RequiredArgsConstructor
public enum Role {

    USER("사용자", "일반 회원"),
    ADMIN("관리자", "관리자");

    private final String label;
    private final String description;

    /** Spring Security 권한 문자열 반환 */
    public String getAuthority() {
        return "ROLE_" + name();
    }
}
