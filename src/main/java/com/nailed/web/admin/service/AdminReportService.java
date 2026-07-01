package com.nailed.web.admin.service;

import com.nailed.common.enums.ReportReason;
import com.nailed.common.enums.ReportStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.util.EnumUtil;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminReportPenalizeRequest;
import com.nailed.web.admin.dto.AdminReportRejectRequest;
import com.nailed.web.admin.dto.AdminReportResponse;
import com.nailed.web.member.entity.Member;
import com.nailed.web.report.entity.Report;
import com.nailed.web.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportService {

    private static final String TARGET_TYPE_MEMBER = "MEMBER";

    private final ReportRepository reportRepository;
    private final AdminMemberService adminMemberService;

    public PageResponse<AdminReportResponse.Summary> getReports(
            String keyword,
            String targetType,
            String reasonCode,
            String status,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {
        validateTargetType(targetType);

        Page<Report> page = reportRepository.searchAdminReports(
                blankToNull(keyword),
                parseReason(reasonCode),
                parseStatus(status),
                dateFrom != null ? dateFrom.atStartOfDay() : null,
                dateTo != null ? dateTo.atTime(LocalTime.MAX) : null,
                pageable
        );

        return PageResponse.of(page.map(this::toSummary));
    }

    @Transactional
    public AdminReportResponse.Summary rejectReport(String reportId, AdminReportRejectRequest request) {
        Report report = findReport(reportId);
        validateProcessable(report);

        String reason = blankToNull(request.reason());
        if (reason == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        report.reject(reason);
        return toSummary(report);
    }

    @Transactional
    public AdminReportResponse.Summary penalizeReport(String reportId, AdminReportPenalizeRequest request) {
        Report report = findReport(reportId);
        validateProcessable(report);

        Member targetMember = report.getTargetMember();
        if (targetMember == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }

        String reason = blankToNull(request.reason());
        if (request.penaltyType() == null || reason == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        adminMemberService.createPenaltyFromReport(
                targetMember,
                request.penaltyType(),
                reason,
                request.penaltyDays(),
                report.getReportId()
        );
        report.done(reason);
        return toSummary(report);
    }

    private AdminReportResponse.Summary toSummary(Report report) {
        Member reporter = report.getReporter();
        Member target = report.getTargetMember();

        return new AdminReportResponse.Summary(
                report.getReportId(),
                reporter.getMemberId(),
                reporter.getUserid(),
                reporter.getNickname(),
                TARGET_TYPE_MEMBER,
                target.getMemberId(),
                target.getNickname() != null ? target.getNickname() : target.getUserid(),
                target.getMemberStatus(),
                target.getSellerGrade(),
                null,
                null,
                null,
                report.getReasonCode().name(),
                report.getDetail(),
                report.getReportStatus().name(),
                report.getProcessedReason(),
                report.getProcessedAt(),
                report.getCreatedAt()
        );
    }

    private Report findReport(String reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new CustomException(ErrorCode.REPORT_NOT_FOUND));
    }

    private void validateProcessable(Report report) {
        if (report.getReportStatus() != ReportStatus.APPROVED) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    // 현재 회원 신고(MEMBER)만 지원 → MEMBER 외 값 차단, null이면 전체 조회
    // targetType 실제 DB 필터링은 미구현 (향후 상품 신고 기능 추가 시 쿼리에 반영 예정)
    private void validateTargetType(String targetType) {
        String value = blankToNull(targetType);
        if (value == null) {
            return;
        }
        if (!TARGET_TYPE_MEMBER.equals(value.toUpperCase())) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private ReportReason parseReason(String reasonCode) {
        String value = blankToNull(reasonCode);
        return value != null ? EnumUtil.parse(ReportReason.class, value, ErrorCode.INVALID_REPORT_REASON) : null;
    }

    private ReportStatus parseStatus(String status) {
        String value = blankToNull(status);
        return value != null ? EnumUtil.parse(ReportStatus.class, value, ErrorCode.INVALID_INPUT_VALUE) : null;
    }

    private String blankToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
