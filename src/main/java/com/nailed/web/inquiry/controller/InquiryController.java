package com.nailed.web.inquiry.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.common.util.SecurityUtil;
import com.nailed.web.inquiry.dto.InquiryRequest;
import com.nailed.web.inquiry.dto.InquiryResponse;
import com.nailed.web.inquiry.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping
    public ResponseEntity<ApiResponse<InquiryResponse.Detail>> create(
            @Valid @RequestBody InquiryRequest.Create request) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(inquiryService.create(memberId, request)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<InquiryResponse.Summary>>> getMyInquiries(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(inquiryService.getMyInquiries(memberId, pageable)));
    }

    @GetMapping("/my/{inquiryId}")
    public ResponseEntity<ApiResponse<InquiryResponse.Detail>> getMyInquiry(@PathVariable String inquiryId) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(inquiryService.getMyInquiry(memberId, inquiryId)));
    }
}
