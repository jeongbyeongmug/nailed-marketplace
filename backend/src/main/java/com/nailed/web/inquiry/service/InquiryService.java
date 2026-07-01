package com.nailed.web.inquiry.service;

import com.nailed.common.enums.InquiryStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.common.util.EnumUtil;
import com.nailed.web.inquiry.dto.InquiryRequest;
import com.nailed.web.inquiry.dto.InquiryResponse;
import com.nailed.web.inquiry.entity.Inquiry;
import com.nailed.web.inquiry.repository.InquiryRepository;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InquiryService {

    private static final String INQUIRY_ID_PREFIX = "INQ_";

    private final InquiryRepository inquiryRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public InquiryResponse.Detail create(String memberId, InquiryRequest.Create request) {
        Member member = findMember(memberId);

        Inquiry inquiry = Inquiry.builder()
                .inquiryId(generateInquiryId())
                .member(member)
                .category(request.category())
                .title(request.title())
                .content(request.content())
                .build();

        return InquiryResponse.Detail.from(inquiryRepository.save(inquiry));
    }

    public PageResponse<InquiryResponse.Summary> getMyInquiries(String memberId, Pageable pageable) {
        Page<InquiryResponse.Summary> page = inquiryRepository.findByMemberMemberId(memberId, pageable)
                .map(InquiryResponse.Summary::from);
        return PageResponse.of(page);
    }

    public InquiryResponse.Detail getMyInquiry(String memberId, String inquiryId) {
        Inquiry inquiry = inquiryRepository.findByInquiryIdAndMemberMemberId(inquiryId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        return InquiryResponse.Detail.from(inquiry);
    }

    public PageResponse<InquiryResponse.AdminSummary> getAdminInquiries(String status, Pageable pageable) {
        Page<Inquiry> inquiries;
        if (status == null || status.isBlank()) {
            inquiries = inquiryRepository.findAll(pageable);
        } else {
            // 요청받은 status 문자열(대소문자 무관)을 InquiryStatus enum으로 변환, 잘못된 값이면 INVALID_INPUT_VALUE 예외 발생
            InquiryStatus inquiryStatus = EnumUtil.parse(
                    InquiryStatus.class,
                    status.trim().toUpperCase(),
                    ErrorCode.INVALID_INPUT_VALUE);
            inquiries = inquiryRepository.findByInquiryStatus(inquiryStatus, pageable);
        }

        return PageResponse.of(inquiries.map(InquiryResponse.AdminSummary::from));
    }

    public InquiryResponse.AdminDetail getAdminInquiry(String inquiryId) {
        Inquiry inquiry = findInquiry(inquiryId);
        return InquiryResponse.AdminDetail.from(inquiry);
    }

    @Transactional
    public InquiryResponse.AdminDetail answer(String inquiryId, InquiryRequest.Answer request) {
        Inquiry inquiry = findInquiry(inquiryId);
        // 답변 대기(PENDING) 상태인 문의만 답변 가능 — 이미 답변된 문의의 재답변(상태 변경) 방지
        if (inquiry.getInquiryStatus() != InquiryStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        inquiry.answer(request.answerContent());
        return InquiryResponse.AdminDetail.from(inquiry);
    }

    private Member findMember(String memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
    }

    private Inquiry findInquiry(String inquiryId) {
        return inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
    }

    // count()+1로 시작해 INQ_001 형식의 ID를 만들고, 이미 존재하는 ID라면(삭제 등으로 번호가 비어있지 않은 경우) 다음 번호로 재시도
    private String generateInquiryId() {
        long num = inquiryRepository.count() + 1;
        String candidateId;
        do {
            candidateId = INQUIRY_ID_PREFIX + String.format("%03d", num++);
        } while (inquiryRepository.existsById(candidateId));
        return candidateId;
    }
}
