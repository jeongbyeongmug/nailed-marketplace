package com.nailed.web.admin.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminMemberPenaltyRequest;
import com.nailed.web.admin.dto.AdminMemberPenaltyResponse;
import com.nailed.web.admin.dto.AdminMemberResponse;
import com.nailed.web.admin.service.AdminMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {

    private final AdminMemberService adminMemberService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminMemberResponse.Summary>>> getMembers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sellerGrade,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminMemberService.getMembers(
                keyword,
                role,
                status,
                sellerGrade,
                pageable
        )));
    }

    @GetMapping("/{memberId}")
    public ResponseEntity<ApiResponse<AdminMemberResponse.Detail>> getMember(@PathVariable String memberId) {
        return ResponseEntity.ok(ApiResponse.success(adminMemberService.getMember(memberId)));
    }

    @PatchMapping("/{memberId}/unsuspend")
    public ResponseEntity<ApiResponse<Void>> unsuspend(@PathVariable String memberId) {
        adminMemberService.unsuspend(memberId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{memberId}/penalties")
    public ResponseEntity<ApiResponse<AdminMemberPenaltyResponse>> createPenalty(
            @PathVariable String memberId,
            @Valid @RequestBody AdminMemberPenaltyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminMemberService.createPenalty(memberId, request)));
    }

    @GetMapping("/{memberId}/penalties")
    public ResponseEntity<ApiResponse<List<AdminMemberPenaltyResponse>>> getPenalties(
            @PathVariable String memberId) {
        return ResponseEntity.ok(ApiResponse.success(adminMemberService.getPenalties(memberId)));
    }
}
