package com.nailed.web.admin.dto;

import java.time.LocalDateTime;

public class AdminReportResponse {

    public record Summary(
            String reportId,
            String reporterId,
            String reporterUserid,
            String reporterNickname,
            String targetType,
            String targetId,
            String targetName,
            String targetMemberStatus,
            String targetSellerGrade,
            Long productId,
            String productTitle,
            String productThumbnailUrl,
            String reasonCode,
            String detail,
            String status,
            String processedReason,
            LocalDateTime processedAt,
            LocalDateTime createdAt
    ) {}
}
