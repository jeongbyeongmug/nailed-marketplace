package com.nailed.web.report.service;
import com.nailed.common.enums.ReportReason;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.common.util.EnumUtil;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.report.dto.ReportRequest;
import com.nailed.web.report.dto.ReportResponse;
import com.nailed.web.report.entity.Report;
import com.nailed.web.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {
    private final ReportRepository reportRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public ReportResponse.Detail submit(String reporterId, ReportRequest.Submit req) {
        if (reporterId.equals(req.targetMemberId())) {
            throw new CustomException(ErrorCode.SELF_REPORT_NOT_ALLOWED);
        }
        if (reportRepository.existsByReporter_MemberIdAndTargetMember_MemberId(reporterId, req.targetMemberId())) {
            throw new CustomException(ErrorCode.REPORT_ALREADY_EXISTS);
        }
        Member reporter = findMember(reporterId);
        Member targetMember = findMember(req.targetMemberId());
        ReportReason reasonCode = EnumUtil.parse(ReportReason.class, req.reasonCode(), ErrorCode.INVALID_REPORT_REASON);
        String reportId = generateReportId();
        Report report = Report.builder()
                .reportId(reportId)
                .reporter(reporter)
                .targetMember(targetMember)
                .reasonCode(reasonCode)
                .detail(req.detail())
                .build();
        return ReportResponse.Detail.from(reportRepository.save(report));
    }

    public PageResponse<ReportResponse.Summary> getMyReports(String memberId, Pageable pageable) {
        return PageResponse.of(
                reportRepository
                        .findMyReports(memberId, pageable)
                        .map(ReportResponse.Summary::from)
        );
    }

    private Member findMember(String memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
    }

    private String generateReportId() {
        int next = reportRepository.findMaxSequentialNumber().orElse(0) + 1;
        return String.format("RPT_%03d", next);
    }
}