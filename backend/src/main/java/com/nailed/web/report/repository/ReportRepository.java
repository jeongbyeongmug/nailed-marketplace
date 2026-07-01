package com.nailed.web.report.repository;

import com.nailed.common.enums.ReportReason;
import com.nailed.common.enums.ReportStatus;
import com.nailed.web.report.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

public interface ReportRepository extends JpaRepository<Report, String> {

    boolean existsByReporter_MemberIdAndTargetMember_MemberId(String reporterId, String targetMemberId);

    // RPT_NNN 형식 ID 중 최댓값 조회 (다음 시퀀스 번호 계산용)
    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(report_id, 5) AS UNSIGNED)), 0) " +
                   "FROM reports WHERE report_id REGEXP '^RPT_[0-9]+$'", nativeQuery = true)
    Optional<Integer> findMaxSequentialNumber();

    @Query(value = """
            SELECT r FROM Report r
            JOIN FETCH r.reporter
            JOIN FETCH r.targetMember
            WHERE (:keyword IS NULL
                OR LOWER(r.reportId) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.reporter.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.reporter.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.targetMember.memberId) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.targetMember.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.targetMember.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.detail) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:reasonCode IS NULL OR r.reasonCode = :reasonCode)
              AND (:status IS NULL OR r.reportStatus = :status)
              AND (:dateFrom IS NULL OR r.createdAt >= :dateFrom)
              AND (:dateTo IS NULL OR r.createdAt <= :dateTo)
            """,
           countQuery = """
            SELECT COUNT(r) FROM Report r
            WHERE (:keyword IS NULL
                OR LOWER(r.reportId) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.reporter.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.reporter.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.targetMember.memberId) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.targetMember.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.targetMember.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(r.detail) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:reasonCode IS NULL OR r.reasonCode = :reasonCode)
              AND (:status IS NULL OR r.reportStatus = :status)
              AND (:dateFrom IS NULL OR r.createdAt >= :dateFrom)
              AND (:dateTo IS NULL OR r.createdAt <= :dateTo)
            """)
    Page<Report> searchAdminReports(
            @Param("keyword") String keyword,
            @Param("reasonCode") ReportReason reasonCode,
            @Param("status") ReportStatus status,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable);
    // 내 신고 목록 (최신순) — Summary 가 targetMember 를 참조하므로 JOIN FETCH 로 N+1 방지
    @Query(value = "SELECT r FROM Report r JOIN FETCH r.targetMember " +
                   "WHERE r.reporter.memberId = :memberId ORDER BY r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM Report r WHERE r.reporter.memberId = :memberId")
    Page<Report> findMyReports(@Param("memberId") String memberId, Pageable pageable);

    @Query(value = """
            SELECT DATE_FORMAT(created_at, :dateFormat) AS label, COUNT(*) AS count
            FROM reports
            WHERE created_at >= :startAt
              AND created_at < :endAt
            GROUP BY DATE_FORMAT(created_at, :dateFormat)
            """, nativeQuery = true)
    List<Object[]> countReportsByPeriod(
            @Param("dateFormat") String dateFormat,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt);
}
