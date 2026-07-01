package com.nailed.web.admin.dto;

import java.time.LocalDateTime;

public class AdminMemberResponse {

    public record Summary(
            String memberId,
            String userid,
            String nickname,
            String role,
            String sellerGrade,
            LocalDateTime createdAt,
            String status
    ) {}

    public record Detail(
            String memberId,
            String userid,
            String nickname,
            String name,
            String role,
            String sellerGrade,
            String memberStatus,
            LocalDateTime lockedUntil,  // 정지 해제 기준일 (SUSPEND일 때 표시)
            int loginCount,
            int loginFailCount,
            boolean marketingAgreed,
            String shopInfo,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            LocalDateTime lastLoginAt
    ) {}
}
