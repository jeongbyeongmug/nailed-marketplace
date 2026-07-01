package com.nailed.web.admin.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.web.admin.dto.AdminDashboardResponse;
import com.nailed.web.admin.dto.AdminDashboardTrendResponse;
import com.nailed.web.admin.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminDashboardResponse.Dashboard>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getDashboard()));
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<AdminDashboardTrendResponse>> getDashboardTrends(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) Integer range) {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getDashboardTrends(period, range)));
    }
}
