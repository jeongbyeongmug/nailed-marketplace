package com.nailed.web.admin.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.web.inquiry.dto.InquiryRequest;
import com.nailed.web.inquiry.dto.InquiryResponse;
import com.nailed.web.inquiry.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/inquiries")
@RequiredArgsConstructor
public class AdminInquiryController {

    private final InquiryService inquiryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InquiryResponse.AdminSummary>>> getInquiries(
            @RequestParam(required = false) String status,
            Pageable pageable) {
        Sort sort;
        if ("ANSWERED".equalsIgnoreCase(status)) {
            sort = Sort.by(Sort.Direction.DESC, "answeredAt");
        } else if (status == null || status.isBlank()) {
            sort = Sort.by(Sort.Direction.DESC, "answeredAt")
                       .and(Sort.by(Sort.Direction.DESC, "createdAt"));
        } else {
            sort = Sort.by(Sort.Direction.DESC, "createdAt");
        }
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        return ResponseEntity.ok(ApiResponse.success(inquiryService.getAdminInquiries(status, sorted)));
    }

    @GetMapping("/{inquiryId}")
    public ResponseEntity<ApiResponse<InquiryResponse.AdminDetail>> getInquiry(@PathVariable String inquiryId) {
        return ResponseEntity.ok(ApiResponse.success(inquiryService.getAdminInquiry(inquiryId)));
    }

    @PatchMapping("/{inquiryId}/answer")
    public ResponseEntity<ApiResponse<InquiryResponse.AdminDetail>> answer(
            @PathVariable String inquiryId,
            @Valid @RequestBody InquiryRequest.Answer request) {
        return ResponseEntity.ok(ApiResponse.success(inquiryService.answer(inquiryId, request)));
    }
}
