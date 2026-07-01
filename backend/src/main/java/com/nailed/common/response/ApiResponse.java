package com.nailed.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nailed.common.exception.ErrorCode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 공통 API 응답 포맷
 *
 * [성공 - 데이터 있음]   ApiResponse.success(data)
 * [성공 - 데이터 없음]   ApiResponse.success()
 * [실패]               throw new CustomException(ErrorCode.XXX)  → GlobalExceptionHandler가 처리
 *
 * 응답 JSON 예시:
 * 성공: { "success": true, "data": { ... } }
 * 실패: { "success": false, "error": { "code": "M001", "message": "..." } }
 */
@Getter
@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

    private final boolean success;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final T data;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final ErrorDetail error;

    // ── 성공 ───────────────────────────────────────────────
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(true, null, null);
    }

    // ── 실패 (GlobalExceptionHandler 전용) ─────────────────
    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return new ApiResponse<>(false, null, new ErrorDetail(errorCode.getCode(), errorCode.getMessage()));
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorDetail(code, message));
    }

    // ── 에러 상세 ──────────────────────────────────────────
    @Getter
    @RequiredArgsConstructor
    public static class ErrorDetail {
        private final String code;
        private final String message;
    }
}
