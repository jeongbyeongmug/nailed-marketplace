package com.nailed.common.util;

import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Returns the current authenticated member id from SecurityContext.
 */
public class SecurityUtil {

    private SecurityUtil() {}

    public static String getCurrentMemberId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof String memberId) {
            return memberId;
        }

        String memberId = principal.toString();
        if (memberId.isBlank()) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return memberId;
    }

    public static String getCurrentMemberIdOrNull() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) return null;
            Object principal = authentication.getPrincipal();
            if (principal == null) return null;
            String memberId = principal instanceof String s ? s : principal.toString();
            return memberId.isBlank() || "anonymousUser".equals(memberId) ? null : memberId;
        } catch (Exception e) {
            return null;
        }
    }
}
