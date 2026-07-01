package com.nailed.web.admin.service;

import com.nailed.common.enums.MemberStatus;
import com.nailed.common.enums.PenaltyType;
import com.nailed.common.enums.Role;
import com.nailed.common.enums.SellerGrade;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminMemberPenaltyRequest;
import com.nailed.web.admin.dto.AdminMemberPenaltyResponse;
import com.nailed.web.admin.dto.AdminMemberResponse;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.entity.MemberPenalty;
import com.nailed.web.member.repository.MemberPenaltyRepository;
import com.nailed.web.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMemberService {

    private final MemberRepository memberRepository;
    private final MemberPenaltyRepository memberPenaltyRepository;

    public PageResponse<AdminMemberResponse.Summary> getMembers(
            String keyword,
            String role,
            String status,
            String sellerGrade,
            Pageable pageable) {
        return PageResponse.of(memberRepository.searchAdminMembers(
                blankToNull(keyword),
                parseRole(role),
                parseStatus(status),
                parseSellerGrade(sellerGrade),
                pageable
        ).map(this::toSummary));
    }

    public AdminMemberResponse.Detail getMember(String memberId) {
        Member member = findMember(memberId);
        return new AdminMemberResponse.Detail(
                member.getMemberId(),
                member.getUserid(),
                member.getNickname(),
                member.getName(),
                member.getRole(),
                member.getSellerGrade(),
                member.getMemberStatus(),
                member.getLockedUntil(),
                member.getLoginCount(),
                member.getLoginFailCount(),
                member.isMarketingAgreed(),
                member.getShopInfo(),
                member.getCreatedAt(),
                member.getUpdatedAt(),
                member.getLastLoginAt()
        );
    }

    @Transactional
    public void unsuspend(String memberId) {
        Member member = findMember(memberId);
        String status = member.getMemberStatus();
        if (!MemberStatus.SUSPEND.name().equals(status) && !MemberStatus.BANNED.name().equals(status)) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
        member.unsuspend();
    }

    @Transactional
    public AdminMemberPenaltyResponse createPenalty(String memberId, AdminMemberPenaltyRequest request) {
        Member member = findMember(memberId);
        return applyPenalty(member, request.penaltyType(), request.reason(), request.penaltyDays(), null);
    }

    public AdminMemberPenaltyResponse createPenaltyFromReport(Member member, PenaltyType penaltyType,
                                                              String reason, Integer penaltyDays, String reportId) {
        return applyPenalty(member, penaltyType, reason, penaltyDays, reportId);
    }

    public List<AdminMemberPenaltyResponse> getPenalties(String memberId) {
        findMember(memberId);
        return memberPenaltyRepository.findByMemberMemberIdOrderByCreatedAtDescPenaltyIdDesc(memberId)
                .stream()
                .map(AdminMemberPenaltyResponse::from)
                .toList();
    }

    private AdminMemberResponse.Summary toSummary(Member member) {
        return new AdminMemberResponse.Summary(
                member.getMemberId(),
                member.getUserid(),
                member.getNickname(),
                member.getRole(),
                member.getSellerGrade(),
                member.getCreatedAt(),
                member.getMemberStatus()
        );
    }

    private Member findMember(String memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
    }

    private void validatePenaltyTarget(Member member) {
        String status = member.getMemberStatus();
        if (MemberStatus.WITHDRAWN.name().equals(status)) {
            throw new CustomException(ErrorCode.MEMBER_WITHDRAWN);
        }
        if (MemberStatus.BANNED.name().equals(status)) {
            throw new CustomException(ErrorCode.MEMBER_BANNED);
        }
    }

    private Integer validateSuspendDays(Integer penaltyDays) {
        if (penaltyDays == null || penaltyDays < 1) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
        return penaltyDays;
    }

    private AdminMemberPenaltyResponse applyPenalty(Member member, PenaltyType penaltyType,
                                                    String reason, Integer requestedPenaltyDays,
                                                    String reportId) {
        validatePenaltyTarget(member);

        String trimmedReason = blankToNull(reason);
        if (penaltyType == null || trimmedReason == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        LocalDateTime startsAt = LocalDateTime.now();
        Integer penaltyDays = null;
        LocalDateTime endsAt = null;

        if (penaltyType == PenaltyType.SUSPEND) {
            penaltyDays = validateSuspendDays(requestedPenaltyDays);
            endsAt = startsAt.plusDays(penaltyDays);
            member.suspendUntil(endsAt);
        } else if (penaltyType == PenaltyType.BAN) {
            member.ban();
        }

        MemberPenalty penalty = memberPenaltyRepository.save(MemberPenalty.builder()
                .member(member)
                .penaltyType(penaltyType)
                .penaltyDays(penaltyDays)
                .reason(trimmedReason)
                .reportId(blankToNull(reportId))
                .startsAt(startsAt)
                .endsAt(endsAt)
                .build());

        return AdminMemberPenaltyResponse.from(penalty);
    }

    private String parseRole(String role) {
        String value = blankToNull(role);
        if (value == null) {
            return null;
        }
        try {
            return Role.valueOf(value.toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private String parseStatus(String status) {
        String value = blankToNull(status);
        if (value == null) {
            return null;
        }
        try {
            return MemberStatus.valueOf(value.toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private String parseSellerGrade(String sellerGrade) {
        String value = blankToNull(sellerGrade);
        if (value == null) {
            return null;
        }
        try {
            return SellerGrade.valueOf(value.toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private String blankToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
