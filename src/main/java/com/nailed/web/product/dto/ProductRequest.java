package com.nailed.web.product.dto;

import jakarta.validation.constraints.*;

import java.util.List;

public class ProductRequest {

    /** 상품 등록 / 수정 공통 */
    public record Form(
            @NotBlank(message = "상품명을 입력해주세요.")
            @Size(max = 100, message = "상품명은 100자 이내로 입력해주세요.")
            String title,

            @NotNull(message = "카테고리를 선택해주세요.")
            Long categoryId,

            Long brandId,

            @NotNull(message = "가격을 입력해주세요.")
            @Min(value = 1000, message = "최소 판매가는 1,000원입니다.")
            Integer price,

            @NotNull(message = "배송비를 입력해주세요.")
            @Min(value = 0, message = "배송비는 0원 이상이어야 합니다.")
            Integer shippingFee,

            @NotBlank(message = "상품 설명을 입력해주세요.")
            String description,

            @NotBlank(message = "상품 상태를 선택해주세요.")
            String conditionCode,

            String size,

            @Size(max = 500, message = "해시태그는 500자 이내로 입력해주세요.")
            String hashtags,

            @NotEmpty(message = "이미지를 최소 1장 이상 등록해 주세요.")
            @Size(max = 10, message = "이미지는 최대 10장까지 등록 가능합니다.")
            List<String> imageUrls
    ) {}

}
