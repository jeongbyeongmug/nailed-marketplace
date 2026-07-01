package com.nailed.web.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthRequest {

    public record Signup(
            @NotBlank(message = "User ID is required.")
            @Size(min = 4, max = 20, message = "User ID must be between 4 and 20 characters.")
            String userid,
            @NotBlank(message = "Nickname is required.")
            @Size(max = 30, message = "Nickname must be 30 characters or less.")
            String nickname,
            @NotBlank(message = "Password is required.")
            @Size(min = 8, max = 64, message = "Password must be between 8 and 64 characters.")
            String password,
            @NotBlank(message = "Name is required.")
            @Size(max = 30, message = "Name must be 30 characters or less.")
            String name,
            @AssertTrue(message = "Service terms agreement is required.")
            boolean serviceTermsAgreed,
            @AssertTrue(message = "Privacy policy agreement is required.")
            boolean privacyPolicyAgreed,
            boolean marketingAgreed
    ) {}

    public record Login(
            @NotBlank(message = "User ID is required.")
            String userid,
            @NotBlank(message = "Password is required.")
            String password
    ) {}

    public record TokenRefresh(
            @NotBlank(message = "Refresh token is required.")
            String refreshToken
    ) {}

    public record PasswordResetRequest(
            @NotBlank(message = "User ID is required.")
            String userid
    ) {}
}
