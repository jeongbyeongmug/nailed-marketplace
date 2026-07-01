package com.nailed.web.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminProductHideRequest(
        @NotBlank(message = "상품 숨김 사유를 입력해주세요.")
        @Size(max = 500, message = "상품 숨김 사유는 500자 이하여야 합니다.")
        String reason
) {
}
