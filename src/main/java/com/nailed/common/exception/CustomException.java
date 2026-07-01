package com.nailed.common.exception;

import lombok.Getter;

/**
 * 비즈니스 로직 예외 최상위 클래스
 *
 * 사용법:
 *   throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
 */
@Getter
public class CustomException extends RuntimeException {

    private static final long serialVersionUID = 1L; 

    private final ErrorCode errorCode;

    public CustomException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
