package com.nailed.web.auth.dto;

import com.nailed.config.jwt.JwtTokenProvider;
import com.nailed.web.member.entity.Member;
import java.time.LocalDateTime;

public class AuthResponse {

    public record DuplicateCheck(
            boolean duplicated
    ) {}

    public record Signup(
            String memberId,
            String userid,
            String nickname,
            String name
    ) {
        public static Signup from(Member member) {
            return new Signup(
                    member.getMemberId(),
                    member.getUserid(),
                    member.getNickname(),
                    member.getName()
            );
        }
    }

    public record Login(
            String memberId,
            String userid,
            String nickname,
            String role,
            String memberStatus,
            String accessToken,
            String tokenType,
            long expiresIn,
            LocalDateTime tokenExpiresAt
           // String refreshToken,
           // long refreshExpiresIn,
            // LocalDateTime refreshTokenExpiresAt
    ) {
        public static Login from(
                Member member,
                JwtTokenProvider.AccessTokenInfo accessTokenInfo,
                JwtTokenProvider.RefreshTokenInfo refreshTokenInfo) {
            return new Login(
                    member.getMemberId(),
                    member.getUserid(),
                    member.getNickname(),
                    member.getRole(),
                    member.getMemberStatus(),
                    accessTokenInfo.accessToken(),
                    accessTokenInfo.tokenType(),
                    accessTokenInfo.expiresIn(),
                    accessTokenInfo.tokenExpiresAt()
                    // refreshTokenInfo.refreshToken(),
//                    refreshTokenInfo.refreshExpiresIn(),
//                    refreshTokenInfo.refreshTokenExpiresAt()
            );
        }
    }

    public record TokenRefresh(
            String memberId,
            String userid,
            String nickname,
            String role,
            String memberStatus,
            String accessToken,
            String tokenType,
            long expiresIn,
            LocalDateTime tokenExpiresAt
    ) {
        public static TokenRefresh from(Member member, JwtTokenProvider.AccessTokenInfo accessTokenInfo) {
            return new TokenRefresh(
                    member.getMemberId(),
                    member.getUserid(),
                    member.getNickname(),
                    member.getRole(),
                    member.getMemberStatus(),
                    accessTokenInfo.accessToken(),
                    accessTokenInfo.tokenType(),
                    accessTokenInfo.expiresIn(),
                    accessTokenInfo.tokenExpiresAt()
            );
        }
    }

    public record PasswordReset(
            String temporaryPassword
    ) {}

    public record SimpleResult(
            boolean success
    ) {}
}
