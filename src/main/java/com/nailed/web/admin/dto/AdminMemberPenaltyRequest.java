package com.nailed.web.admin.dto;

import com.nailed.common.enums.PenaltyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminMemberPenaltyRequest(
        @NotNull(message = "제재 유형을 선택해주세요.")
        PenaltyType penaltyType,

        @NotBlank(message = "제재 사유를 입력해주세요.")
        @Size(max = 500, message = "제재 사유는 500자 이하여야 합니다.")
        String reason,

        Integer penaltyDays
) {
}
