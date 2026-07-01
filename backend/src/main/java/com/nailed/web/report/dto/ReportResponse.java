package com.nailed.web.report.dto;
import com.nailed.web.report.entity.Report;
import java.time.LocalDateTime;
public class ReportResponse {
    /** 신고 접수 결과 */
    public record Detail(
            String reportId,
            String reporterId,
            String targetMemberId,
            String reasonCode,      // FRAUD / MISLEADING_INFO / PROHIBITED_ITEM / ETC
            String reasonLabel,     // 사기 / 상품 정보 허위/불일치 / 금지상품 / 기타
            String detail,
            String reportStatus,    // APPROVED=접수대기 / REJECTED=반려 / DONE=처리완료
            LocalDateTime createdAt
    ) {
        public static Detail from(Report report) {
            return new Detail(
                    report.getReportId(),
                    report.getReporter().getMemberId(),
                    report.getTargetMember().getMemberId(),
                    report.getReasonCode().name(),
                    report.getReasonCode().getLabel(),
                    report.getDetail(),
                    report.getReportStatus().name(),
                    report.getCreatedAt()
            );
        }
    }
    public record Summary(
            String reportId,
            String targetMemberId,
            String targetNickname,
            String reasonCode,
            String reasonLabel,
            String detail,
            String reportStatus,
            String processedReason,
            LocalDateTime createdAt
    ) {
        public static Summary from(Report report) {
            return new Summary(
                    report.getReportId(),
                    report.getTargetMember().getMemberId(),
                    report.getTargetMember().getNickname(),
                    report.getReasonCode().name(),
                    report.getReasonCode().getLabel(),
                    report.getDetail(),
                    report.getReportStatus().name(),
                    report.getProcessedReason(),
                    report.getCreatedAt()
            );
        }
    }
}