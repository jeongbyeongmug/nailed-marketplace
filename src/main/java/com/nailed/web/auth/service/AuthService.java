package com.nailed.web.auth.service;

import com.nailed.web.auth.dto.AuthRequest;
import com.nailed.web.auth.dto.AuthResponse;

import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {

	AuthResponse.DuplicateCheck checkUserid(String userid);

	AuthResponse.DuplicateCheck checkNickname(String nickname);

	AuthResponse.Signup signup(AuthRequest.Signup request);

	/**
	 * noRollbackFor 이유: 로그인 실패 시 실패 횟수를 DB에 저장해야 하는데
	 * CustomException 발생으로 롤백되면 카운트가 저장 안 됨
	 */
	AuthResponse.Login login(AuthRequest.Login request, HttpServletResponse response);

	AuthResponse.TokenRefresh refreshAccessToken(String refreshToken);

	AuthResponse.SimpleResult logout(String refreshToken, HttpServletResponse response);

	AuthResponse.PasswordReset requestPasswordReset(AuthRequest.PasswordResetRequest request);

}