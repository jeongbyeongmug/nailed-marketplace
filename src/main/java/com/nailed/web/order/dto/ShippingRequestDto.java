package com.nailed.web.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ShippingRequestDto {

    // 택배사 코드 (CJ / KOREA_POST / LOTTE / HANJIN / LOGEN)
    @NotBlank(message = "택배사 코드는 필수입니다.")
    @Size(max = 20)
    private String carrierCode;

    // 운송장 번호
    @NotBlank(message = "운송장 번호는 필수입니다.")
    @Size(max = 50)
    private String trackingNumber;
}
