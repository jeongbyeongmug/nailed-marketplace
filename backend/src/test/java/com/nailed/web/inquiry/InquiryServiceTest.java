package com.nailed.web.inquiry;

import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.web.inquiry.dto.InquiryRequest;
import com.nailed.web.inquiry.dto.InquiryResponse;
import com.nailed.web.inquiry.repository.InquiryRepository;
import com.nailed.web.inquiry.service.InquiryService;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 문의(CS) 도메인 통합 테스트.
 *
 * <p>문의 등록, 본인 문의 조회 권한, 답변 상태 전이(PENDING → ANSWERED),
 * 이미 답변된 문의의 재답변 차단, 관리자 상태 필터의 잘못된 값 처리 등을 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("문의 서비스 - 등록 · 권한 · 답변 상태 전이")
class InquiryServiceTest {

    @Autowired private InquiryService inquiryService;
    @Autowired private InquiryRepository inquiryRepository;
    @Autowired private MemberRepository memberRepository;

    private String memberId;

    @BeforeEach
    void setUp() {
        cleanUp();
        Member member = memberRepository.save(Member.builder()
                .memberId("MEMBER0000000000001")
                .userid("asker01")
                .passwordHash("hashed-password")
                .nickname("문의자01")
                .name("정문의")
                .build());
        memberId = member.getMemberId();
    }

    @Test
    @DisplayName("문의 등록 시 PENDING 상태로 생성되고 작성자·내용이 반영된다")
    void create_savesPendingInquiry() {
        InquiryResponse.Detail detail = inquiryService.create(
                memberId, new InquiryRequest.Create("배송문의", "언제 배송되나요?", "결제했는데 배송 시작이 안 됩니다."));

        assertThat(detail.inquiryId()).startsWith("INQ_");
        assertThat(detail.memberId()).isEqualTo(memberId);
        assertThat(detail.category()).isEqualTo("배송문의");
        assertThat(detail.inquiryStatus()).isEqualTo("PENDING");
        assertThat(detail.answerContent()).isNull();
        assertThat(inquiryRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("존재하지 않는 회원의 문의 등록은 M001로 차단")
    void create_unknownMember_isRejected() {
        CustomException ex = expectCustom(() -> inquiryService.create(
                "NO_SUCH_MEMBER", new InquiryRequest.Create("일반", "제목", "내용")));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND); // M001
    }

    @Test
    @DisplayName("남의 문의를 내 문의로 조회하면 NOT_FOUND (소유권 검증)")
    void getMyInquiry_otherOwner_isNotFound() {
        String inquiryId = inquiryService.create(
                memberId, new InquiryRequest.Create("일반", "제목", "내용")).inquiryId();

        CustomException ex = expectCustom(() -> inquiryService.getMyInquiry("ANOTHER_MEMBER", inquiryId));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND); // C004
    }

    @Test
    @DisplayName("관리자 답변 시 PENDING → ANSWERED 로 전이되고 답변·답변시각이 기록된다")
    void answer_movesPendingToAnswered() {
        String inquiryId = inquiryService.create(
                memberId, new InquiryRequest.Create("결제문의", "환불되나요?", "환불 절차가 궁금합니다.")).inquiryId();

        InquiryResponse.AdminDetail answered = inquiryService.answer(
                inquiryId, new InquiryRequest.Answer("영업일 3일 내 환불 처리됩니다."));

        assertThat(answered.inquiryStatus()).isEqualTo("ANSWERED");
        assertThat(answered.answerContent()).isEqualTo("영업일 3일 내 환불 처리됩니다.");
        assertThat(answered.answeredAt()).isNotNull();
    }

    @Test
    @DisplayName("이미 답변된 문의의 재답변은 INVALID_INPUT_VALUE 로 차단")
    void answer_alreadyAnswered_isRejected() {
        String inquiryId = inquiryService.create(
                memberId, new InquiryRequest.Create("일반", "제목", "내용")).inquiryId();
        inquiryService.answer(inquiryId, new InquiryRequest.Answer("첫 답변"));

        CustomException ex = expectCustom(() ->
                inquiryService.answer(inquiryId, new InquiryRequest.Answer("두 번째 답변")));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_INPUT_VALUE); // C001
    }

    @Test
    @DisplayName("관리자 목록 조회 시 잘못된 상태 문자열은 INVALID_INPUT_VALUE 로 차단")
    void getAdminInquiries_invalidStatus_isRejected() {
        CustomException ex = expectCustom(() ->
                inquiryService.getAdminInquiries("NOT_A_STATUS", PageRequest.of(0, 10)));
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_INPUT_VALUE); // C001
    }

    // ── helpers ─────────────────────────────────────────────
    private CustomException expectCustom(Runnable action) {
        try {
            action.run();
        } catch (CustomException e) {
            return e;
        }
        throw new AssertionError("CustomException 이 발생해야 하는데 발생하지 않았습니다.");
    }

    private void cleanUp() {
        inquiryRepository.deleteAll();
        memberRepository.deleteAll();
    }
}
