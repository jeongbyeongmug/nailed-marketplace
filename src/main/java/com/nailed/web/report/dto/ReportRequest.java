package com.nailed.web.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ReportRequest {

    /** 신고 접수 */
    public record Submit(
            // 피신고 회원 ID
            @NotBlank(message = "신고 대상 회원 ID를 입력해주세요.")
            String targetMemberId,

            // FRAUD / MISLEADING_INFO / PROHIBITED_ITEM / ETC
            @NotBlank(message = "신고 사유를 선택해주세요.")
            String reasonCode,

            // 상세 내용 (선택)
            @Size(max = 500, message = "상세 내용은 500자 이내로 입력해주세요.")
            String detail
    ) {}
}
