package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 회원 계정 상태
 * DB: members.member_status VARCHAR(20) DEFAULT 'ACTIVE'
 * 주석값: ACTIVE/LOCKED/WITHDRAWN/SUSPEND/BANNED
 */
@Getter
@RequiredArgsConstructor
public enum MemberStatus {

    ACTIVE("활동중", "정상 활동 중인 회원"),
    LOCKED("잠금", "로그인 실패 누적 등으로 일시 잠금된 계정"),
    WITHDRAWN("탈퇴", "탈퇴한 회원"),
    SUSPEND("정지", "기간 정지 회원"),
    BANNED("영구정지", "영구 정지 회원");

    private final String label;
    private final String description;
}
