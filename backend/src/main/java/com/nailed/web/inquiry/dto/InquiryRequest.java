package com.nailed.web.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class InquiryRequest {

    public record Create(
            @NotBlank(message = "문의 카테고리를 입력해주세요.")
            @Size(max = 30, message = "문의 카테고리는 30자 이내로 입력해주세요.")
            String category,

            @NotBlank(message = "문의 제목을 입력해주세요.")
            @Size(max = 100, message = "문의 제목은 100자 이내로 입력해주세요.")
            String title,

            @NotBlank(message = "문의 내용을 입력해주세요.")
            @Size(max = 1000, message = "문의 내용은 1000자 이내로 입력해주세요.")
            String content
    ) {}

    public record Answer(
            @NotBlank(message = "답변 내용을 입력해주세요.")
            @Size(max = 1000, message = "답변 내용은 1000자 이내로 입력해주세요.")
            String answerContent
    ) {}
}
