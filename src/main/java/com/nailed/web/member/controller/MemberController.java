package com.nailed.web.member.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.common.util.SecurityUtil;
import com.nailed.web.member.dto.MemberRequest;
import com.nailed.web.member.dto.MemberResponse;
import com.nailed.web.member.service.MemberService;
import com.nailed.web.member.service.ProfileImageStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MemberController {

    private final MemberService memberService;
    private final ProfileImageStorageService profileImageStorageService;

    @GetMapping("/users/{memberId}")
    public ResponseEntity<ApiResponse<MemberResponse.Home>> getUserHome(@PathVariable String memberId) {
        return ResponseEntity.ok(ApiResponse.success(memberService.getUserHome(memberId)));
    }

    @GetMapping("/members/mypage/profile")
    public ResponseEntity<ApiResponse<MemberResponse.Profile>> getMyProfile() {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(memberService.getProfile(memberId)));
    }

    @PutMapping("/members/mypage/profile")
    public ResponseEntity<ApiResponse<MemberResponse.Profile>> updateMyProfile(
            @Valid @RequestBody MemberRequest.ProfileUpdate request) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(memberService.updateProfile(memberId, request)));
    }

    @PostMapping("/members/mypage/profile/image")
    public ResponseEntity<ApiResponse<String>> uploadProfileImage(MultipartFile file) {
        String memberId = SecurityUtil.getCurrentMemberId();
        String url = profileImageStorageService.store(file, memberId);
        return ResponseEntity.ok(ApiResponse.success(url));
    }

    @DeleteMapping("/members/mypage/profile/image")
    public ResponseEntity<ApiResponse<Void>> deleteProfileImage() {
        String memberId = SecurityUtil.getCurrentMemberId();
        memberService.deleteProfileImage(memberId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/members/mypage/products")
    public ResponseEntity<ApiResponse<PageResponse<MemberResponse.ProductSummary>>> getMyProducts(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(memberService.getMyProducts(memberId, status, pageable)));
    }

    @GetMapping("/members/mypage/orders")
    public ResponseEntity<ApiResponse<PageResponse<MemberResponse.OrderSummary>>> getMyOrders(
            @RequestParam(defaultValue = "BUY") String type,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(memberService.getMyOrders(memberId, type, status, pageable)));
    }

    @GetMapping("/members/mypage/settlements")
    public ResponseEntity<ApiResponse<PageResponse<MemberResponse.SettlementSummary>>> getMySettlements(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(memberService.getMySettlements(memberId, status, pageable)));
    }

    @GetMapping("/members/mypage/account-info")
    public ResponseEntity<ApiResponse<MemberResponse.AccountInfo>> getAccountInfo() {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(memberService.getAccountInfo(memberId)));
    }

    @PutMapping("/members/mypage/account-info")
    public ResponseEntity<ApiResponse<Void>> updateAccountInfo(
            @Valid @RequestBody MemberRequest.UpdateAccountInfo request) {
        String memberId = SecurityUtil.getCurrentMemberId();
        memberService.updateAccountInfo(memberId, request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/members/mypage")
    public ResponseEntity<ApiResponse<Void>> withdraw() {
        String memberId = SecurityUtil.getCurrentMemberId();
        memberService.withdraw(memberId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
