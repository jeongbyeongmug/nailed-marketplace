package com.nailed.common.util;

import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;

/**
 * Enum 안전 파싱 유틸
 *
 * 사용법:
 *   OrderStatus status = EnumUtil.parse(OrderStatus.class, "PAID", ErrorCode.INVALID_INPUT_VALUE);
 */
public class EnumUtil {

    private EnumUtil() {}

    public static <T extends Enum<T>> T parse(Class<T> clazz, String value, ErrorCode errorCode) {
        try {
            return Enum.valueOf(clazz, value);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new CustomException(errorCode);
        }
    }
}
