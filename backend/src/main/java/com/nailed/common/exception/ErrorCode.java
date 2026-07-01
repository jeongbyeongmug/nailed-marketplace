package com.nailed.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 전역 에러 코드 정의
 * DB 스키마 기준 (members, product_groups, products, product_images, orders,
 *               reviews, reports, member_penalties, wishlists 9개 테이블)
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ─────────────────────────────────────────────────────────────────
    // C : Common
    // ─────────────────────────────────────────────────────────────────
    INVALID_INPUT_VALUE                 (HttpStatus.BAD_REQUEST,            "C001", "입력값이 올바르지 않습니다."),
    METHOD_NOT_ALLOWED                  (HttpStatus.METHOD_NOT_ALLOWED,     "C002", "지원하지 않는 HTTP 메서드입니다."),
    INTERNAL_SERVER_ERROR               (HttpStatus.INTERNAL_SERVER_ERROR,  "C003", "서버 내부 오류가 발생했습니다."),
    NOT_FOUND                           (HttpStatus.NOT_FOUND,              "C004", "요청한 리소스를 찾을 수 없습니다."),
    UNAUTHORIZED                        (HttpStatus.UNAUTHORIZED,           "C005", "인증이 필요합니다."),
    FORBIDDEN                           (HttpStatus.FORBIDDEN,              "C006", "접근 권한이 없습니다."),
    INVALID_JSON                        (HttpStatus.BAD_REQUEST,            "C007", "JSON 형식이 올바르지 않습니다."),
    MISSING_PARAMETER                   (HttpStatus.BAD_REQUEST,            "C008", "필수 파라미터가 누락되었습니다."),
    UNSUPPORTED_MEDIA_TYPE              (HttpStatus.UNSUPPORTED_MEDIA_TYPE, "C009", "지원하지 않는 미디어 타입입니다."),

    // ─────────────────────────────────────────────────────────────────
    // M : Member (members 테이블)
    // ─────────────────────────────────────────────────────────────────
    MEMBER_NOT_FOUND                    (HttpStatus.NOT_FOUND,              "M001", "존재하지 않는 회원입니다."),
    MEMBER_ALREADY_EXISTS               (HttpStatus.CONFLICT,               "M002", "이미 가입된 회원입니다."),
    MEMBER_WITHDRAWN                    (HttpStatus.BAD_REQUEST,            "M003", "탈퇴한 회원입니다."),
    MEMBER_SUSPENDED                    (HttpStatus.FORBIDDEN,              "M004", "일시 정지된 계정입니다. 관리자에게 문의하세요."),
    MEMBER_BANNED                       (HttpStatus.FORBIDDEN,              "M005", "영구 정지된 계정입니다."),
    MEMBER_LOCKED                       (HttpStatus.FORBIDDEN,              "M006", "비밀번호를 5회 잘못 입력했습니다. 보안을 위해 10분 후 다시 시도해주세요."),
    INVALID_TOKEN                       (HttpStatus.UNAUTHORIZED,           "M007", "유효하지 않은 토큰입니다."),
    TOKEN_EXPIRED                       (HttpStatus.UNAUTHORIZED,           "M008", "만료된 토큰입니다. 다시 로그인해주세요."),
    NICKNAME_DUPLICATED                 (HttpStatus.CONFLICT,               "M009", "이미 사용 중인 닉네임입니다."),
    INVALID_LOGIN                       (HttpStatus.UNAUTHORIZED,           "M010", "아이디 또는 비밀번호가 올바르지 않습니다."),
    MESSAGE_SEND_FAILED                 (HttpStatus.INTERNAL_SERVER_ERROR,  "M011", "메시지 발송에 실패했습니다."),
    INVALID_BANK_ACCOUNT                (HttpStatus.BAD_REQUEST,            "M012", "유효하지 않은 계좌 정보입니다."),
    INVALID_REFERRER                    (HttpStatus.BAD_REQUEST,            "M013", "존재하지 않는 추천인 닉네임입니다."),
    FILE_UPLOAD_FAILED                  (HttpStatus.INTERNAL_SERVER_ERROR,  "M014", "파일 업로드에 실패했습니다."),
    WITHDRAW_HAS_ACTIVE_ORDER           (HttpStatus.CONFLICT,               "M015", "진행중인 거래가 있어 탈퇴할 수 없습니다."),

    // ─────────────────────────────────────────────────────────────────
    // P : Product (products / product_groups / product_images 테이블)
    // ─────────────────────────────────────────────────────────────────
    PRODUCT_NOT_FOUND                   (HttpStatus.NOT_FOUND,              "P001", "존재하지 않는 상품입니다."),
    PRODUCT_ALREADY_SOLD                (HttpStatus.BAD_REQUEST,            "P002", "판매 완료된 상품입니다."),
    PRODUCT_DELETED                     (HttpStatus.BAD_REQUEST,            "P003", "삭제된 상품입니다."),
    PRODUCT_UNAUTHORIZED                (HttpStatus.FORBIDDEN,              "P004", "해당 상품에 대한 권한이 없습니다."),
    CATEGORY_NOT_FOUND                  (HttpStatus.NOT_FOUND,              "P006", "존재하지 않는 카테고리입니다."),
    BRAND_NOT_FOUND                     (HttpStatus.NOT_FOUND,              "P007", "존재하지 않는 브랜드입니다."),
    INVALID_GROUP_TYPE                  (HttpStatus.BAD_REQUEST,            "P008", "유효하지 않은 그룹 타입입니다. (CATEGORY/BRAND)"),
    PRODUCT_IMAGE_NOT_FOUND             (HttpStatus.NOT_FOUND,              "P009", "존재하지 않는 상품 이미지입니다."),
    PRODUCT_IMAGE_LIMIT_EXCEEDED        (HttpStatus.BAD_REQUEST,            "P010", "상품 이미지는 최대 10개까지만 등록 가능합니다."),
    PRODUCT_IMAGE_SIZE_EXCEEDED         (HttpStatus.BAD_REQUEST,            "P011", "이미지 파일은 5MB 이하만 업로드 가능합니다."),
    PRODUCT_HAS_ACTIVE_ORDER            (HttpStatus.CONFLICT,               "P012", "진행중인 거래가 있어 상품을 삭제할 수 없습니다."),
    INVALID_SIZE                        (HttpStatus.BAD_REQUEST,            "P013", "유효하지 않은 사이즈입니다."),

    // ─────────────────────────────────────────────────────────────────
    // O : Order / Payment (orders 테이블에 통합)
    // ─────────────────────────────────────────────────────────────────
    ORDER_NOT_FOUND                     (HttpStatus.NOT_FOUND,              "O001", "존재하지 않는 주문입니다."),
    ORDER_INVALID_STATUS                (HttpStatus.BAD_REQUEST,            "O002", "현재 주문 상태에서는 지원하지 않는 요청입니다."),
    ORDER_UNAUTHORIZED                  (HttpStatus.FORBIDDEN,              "O003", "해당 주문에 대한 권한이 없습니다."),
    SELF_ORDER_NOT_ALLOWED              (HttpStatus.BAD_REQUEST,            "O004", "본인이 등록한 상품은 구매할 수 없습니다."),
    PAYMENT_FAILED                      (HttpStatus.BAD_REQUEST,            "O005", "결제 승인이 정상적으로 완료되지 않았습니다."),
    PAYMENT_ALREADY_COMPLETED           (HttpStatus.BAD_REQUEST,            "O006", "결제가 완료된 주문입니다."),
    PAYMENT_AMOUNT_MISMATCH             (HttpStatus.BAD_REQUEST,            "O007", "결제 금액이 일치하지 않습니다."),
    CANCEL_ALREADY_REQUESTED            (HttpStatus.CONFLICT,               "O008", "취소 요청이 접수된 주문입니다."),
    CANCEL_NOT_ALLOWED                  (HttpStatus.BAD_REQUEST,            "O009", "현재 상태에서는 취소할 수 없습니다."),
    PAYMENT_REFUND_FAILED               (HttpStatus.BAD_REQUEST,            "O010", "환불 처리가 정상적으로 완료되지 않았습니다."),
    INVALID_FINAL_PRICE                 (HttpStatus.BAD_REQUEST,            "O011", "최종 결제 금액이 일치하지 않습니다."),
    LOCK_ACQUISITION_FAILED             (HttpStatus.CONFLICT,               "O012", "현재 다른 고객님이 결제를 진행 중인 상품입니다."),

    // ─────────────────────────────────────────────────────────────────
    // D : Delivery (orders.carrier_code / tracking_number 로 통합)
    // ─────────────────────────────────────────────────────────────────
    INVALID_COURIER_CODE                (HttpStatus.BAD_REQUEST,            "D001", "지원하지 않는 택배사입니다."),
    TRACKING_NUMBER_ALREADY_EXISTS      (HttpStatus.CONFLICT,               "D002", "운송장 번호가 이미 등록되어 있습니다."),
    DELIVERY_INVALID_STATUS             (HttpStatus.BAD_REQUEST,            "D003", "현재 배송 단계에서는 진행할 수 없습니다."),
    INVALID_TRACKING_NUMBER             (HttpStatus.BAD_REQUEST,            "D004", "유효하지 않은 운송장 번호입니다. 숫자 10~13자리로 입력해주세요."),

    // ─────────────────────────────────────────────────────────────────
    // R : Report / Penalty (reports / member_penalties 테이블)
    // ─────────────────────────────────────────────────────────────────
    REPORT_NOT_FOUND                    (HttpStatus.NOT_FOUND,              "R001", "신고 내역을 찾을 수 없습니다."),
    REPORT_ALREADY_EXISTS               (HttpStatus.CONFLICT,               "R002", "이미 신고가 접수된 대상입니다."),
    SELF_REPORT_NOT_ALLOWED             (HttpStatus.BAD_REQUEST,            "R003", "본인이 등록한 상품은 신고할 수 없습니다."),
    INVALID_REPORT_REASON               (HttpStatus.BAD_REQUEST,            "R004", "올바르지 않은 신고 사유입니다."),
    PENALTY_NOT_FOUND                   (HttpStatus.NOT_FOUND,              "R005", "제재 내역을 찾을 수 없습니다."),
    INVALID_PENALTY_TYPE                (HttpStatus.BAD_REQUEST,            "R006", "지원하지 않는 제재 유형입니다. (WARNING/SUSPEND/BAN)"),
    INVALID_PENALTY_DAYS                (HttpStatus.BAD_REQUEST,            "R007", "정지 기간 설정이 올바르지 않습니다."),

    // ─────────────────────────────────────────────────────────────────
    // V : Review (reviews 테이블)
    // ─────────────────────────────────────────────────────────────────
    REVIEW_NOT_FOUND                    (HttpStatus.NOT_FOUND,              "V001", "리뷰를 찾을 수 없습니다."),
    REVIEW_ALREADY_EXISTS               (HttpStatus.CONFLICT,               "V002", "이미 리뷰가 등록된 주문입니다."),
    REVIEW_NOT_ALLOWED                  (HttpStatus.BAD_REQUEST,            "V003", "구매가 확정된 주문만 리뷰를 작성할 수 있습니다."),
    INVALID_RATING                      (HttpStatus.BAD_REQUEST,            "V004", "별점은 1~5점 사이여야 합니다."),

    // ─────────────────────────────────────────────────────────────────
    // W : Wishlist (wishlist 테이블)
    // ─────────────────────────────────────────────────────────────────
    WISHLIST_ALREADY_EXISTS             (HttpStatus.CONFLICT,               "W001", "이미 찜한 상품입니다."),
    WISHLIST_NOT_FOUND                  (HttpStatus.NOT_FOUND,              "W002", "찜 목록에 없는 상품입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
