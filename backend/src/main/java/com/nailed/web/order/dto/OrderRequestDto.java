package com.nailed.web.order.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@NoArgsConstructor
public class OrderRequestDto {

    @NotNull(message = "상품 ID는 필수입니다.")
    private Long productId;

    @NotBlank(message = "수령자 이름은 필수입니다.")
    @Size(max = 30)
    private String receiverName;

    @NotBlank(message = "수령자 연락처는 필수입니다.")
    @Size(max = 50)
    private String receiverPhone;

    @NotBlank(message = "우편번호는 필수입니다.")
    @Size(max = 10)
    private String receiverZipcode;

    @NotBlank(message = "배송지 주소는 필수입니다.")
    @Size(max = 200)
    private String receiverAddress;

    @Size(max = 100)
    private String receiverAddressDetail;

    @Size(max = 255)
    private String deliveryRequest;

}
