package com.nailed.web.review.dto;

import jakarta.validation.constraints.*;

public class ReviewRequest {

    /** 리뷰 작성 */
    public record Write(
            @NotBlank(message = "주문 ID를 입력해주세요.")
            String orderId,

            @Min(value = 1, message = "별점은 최소 1점 이상만 등록 가능합니다.")
            @Max(value = 5, message = "별점은 최대 5점 이하만 등록 가능합니다.")
            int rating,

            @Size(max = 500, message = "리뷰 내용은 500자 이내로 입력해주세요.")
            String content
    ) {}
}
