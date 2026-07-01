package com.nailed.web.admin.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminReportPenalizeRequest;
import com.nailed.web.admin.dto.AdminReportRejectRequest;
import com.nailed.web.admin.dto.AdminReportResponse;
import com.nailed.web.admin.service.AdminReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminReportResponse.Summary>>> getReports(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String reasonCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminReportService.getReports(
                keyword,
                targetType,
                reasonCode,
                status,
                dateFrom,
                dateTo,
                pageable
        )));
    }

    @PatchMapping("/{reportId}/reject")
    public ResponseEntity<ApiResponse<AdminReportResponse.Summary>> rejectReport(
            @PathVariable String reportId,
            @Valid @RequestBody AdminReportRejectRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminReportService.rejectReport(reportId, request)));
    }

    @PatchMapping("/{reportId}/penalize")
    public ResponseEntity<ApiResponse<AdminReportResponse.Summary>> penalizeReport(
            @PathVariable String reportId,
            @Valid @RequestBody AdminReportPenalizeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminReportService.penalizeReport(reportId, request)));
    }
}
