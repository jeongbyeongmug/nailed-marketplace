package com.nailed.web.admin.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminOrderCancelRequest;
import com.nailed.web.admin.dto.AdminOrderResponse;
import com.nailed.web.admin.service.AdminOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminOrderResponse.Summary>>> getOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String orderStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @PageableDefault(size = 10, sort = "paidAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.getOrders(
                keyword,
                orderStatus,
                dateFrom,
                dateTo,
                pageable
        )));
    }

    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<AdminOrderResponse.Summary>> cancelOrder(
            @PathVariable String orderId,
            @Valid @RequestBody AdminOrderCancelRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.cancelOrder(orderId, request)));
    }
}
