package com.nailed.web.report.entity;

import com.nailed.common.entity.CreatedOnlyEntity;
import com.nailed.common.enums.ReportReason;
import com.nailed.common.enums.ReportStatus;
import com.nailed.web.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 신고 엔티티
 * - 신고 대상: target_member_id (회원 단방향 신고)
 * - DB 스키마상 report_id는 'RPT_001' 형태의 VARCHAR → 애플리케이션에서 생성
 * - CreatedOnlyEntity 상속 → created_at 자동 관리
 */
@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Report extends CreatedOnlyEntity {

    @Id
    @Column(name = "report_id", length = 20)
    private String reportId;

    // 신고자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private Member reporter;

    // 신고 사유 코드 (FRAUD / MISLEADING_INFO / PROHIBITED_ITEM / ETC)
    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", length = 30, nullable = false)
    private ReportReason reasonCode;

    // 상세 내용 (선택)
    @Column(name = "detail", length = 500)
    private String detail;

    // 피신고 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_member_id", nullable = false)
    private Member targetMember;

    // 처리 상태 (APPROVED=접수대기 / REJECTED=반려 / DONE=처리완료)
    @Enumerated(EnumType.STRING)
    @Column(name = "report_status", length = 20, nullable = false)
    @Builder.Default
    private ReportStatus reportStatus = ReportStatus.APPROVED; // 신고 접수됨(처리 대기 중)

    // 관리자 처리 사유
    @Column(name = "processed_reason", length = 500)
    private String processedReason;

    // 처리 일시
    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    // ── 비즈니스 메서드 (관리자 처리용) ─────────────────────

    public void reject(String reason) {
        this.reportStatus = ReportStatus.REJECTED;
        this.processedReason = reason;
        this.processedAt = LocalDateTime.now();
    }

    public void done(String reason) {
        this.reportStatus = ReportStatus.DONE;
        this.processedReason = reason;
        this.processedAt = LocalDateTime.now();
    }
}
