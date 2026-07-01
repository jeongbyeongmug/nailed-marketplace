package com.nailed.web.member.dto;

import jakarta.validation.constraints.Size;

public class MemberRequest {

    public record ProfileUpdate(
            @Size(max = 30)
            String nickname,

            @Size(max = 500)
            String shopInfo,

            @Size(max = 20)
            String bankCode,

            @Size(max = 30)
            String accountNumber,

            @Size(max = 30)
            String depositorName,

            String profileImageUrl
    ) {}

    public record UpdateAccountInfo(
            @Size(max = 20)
            String bankCode,

            @Size(max = 30)
            String accountNumber,

            @Size(max = 30)
            String depositorName
    ) {}
}