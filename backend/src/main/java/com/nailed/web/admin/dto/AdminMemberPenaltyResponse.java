package com.nailed.web.admin.dto;

import com.nailed.common.enums.PenaltyType;
import com.nailed.web.member.entity.MemberPenalty;

import java.time.LocalDateTime;

public record AdminMemberPenaltyResponse(
        Long penaltyId,
        String memberId,
        PenaltyType penaltyType,
        Integer penaltyDays,
        String reason,
        String reportId,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        LocalDateTime createdAt
) {

    public static AdminMemberPenaltyResponse from(MemberPenalty penalty) {
        return new AdminMemberPenaltyResponse(
                penalty.getPenaltyId(),
                penalty.getMember().getMemberId(),
                penalty.getPenaltyType(),
                penalty.getPenaltyDays(),
                penalty.getReason(),
                penalty.getReportId(),
                penalty.getStartsAt(),
                penalty.getEndsAt(),
                penalty.getCreatedAt()
        );
    }
}
