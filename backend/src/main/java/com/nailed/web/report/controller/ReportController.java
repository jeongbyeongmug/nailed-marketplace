package com.nailed.web.report.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.common.util.SecurityUtil;
import com.nailed.web.report.dto.ReportRequest;
import com.nailed.web.report.dto.ReportResponse;
import com.nailed.web.report.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReportResponse.Detail>> submit(
            @Valid @RequestBody ReportRequest.Submit request) {
        String reporterId = SecurityUtil.getCurrentMemberId();
        ReportResponse.Detail result = reportService.submit(reporterId, request);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PageResponse<ReportResponse.Summary>>> getMyReports(
            @PageableDefault(size = 10) Pageable pageable) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(reportService.getMyReports(memberId, pageable)));
    }
}