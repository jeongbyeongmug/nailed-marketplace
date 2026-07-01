package com.nailed.web.wishlist.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.common.util.SecurityUtil;
import com.nailed.web.product.dto.ProductResponse;
import com.nailed.web.wishlist.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 찜 (Wishlist) API
 *
 * IA 화면 매핑:
 *   - nld-403 상품 상세  → 찜 버튼   : POST/DELETE /api/products/{productId}/wishlist
 *   - nld-904 찜 목록   → 목록 조회 : GET    /api/members/mypage/wishlist
 *
 * 모든 엔드포인트 로그인 필요 (SecurityUtil.getCurrentMemberId 호출 시 UNAUTHORIZED)
 */
@RestController
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    // ── 찜 등록 (상품 상세) ───────────────────────────────────

    @PostMapping("/api/products/{productId}/wishlist")
    public ResponseEntity<ApiResponse<Void>> addWishlist(@PathVariable Long productId) {
        String memberId = SecurityUtil.getCurrentMemberId();
        wishlistService.addWishlist(memberId, productId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 찜 취소 (상품 상세) ───────────────────────────────────

    @DeleteMapping("/api/products/{productId}/wishlist")
    public ResponseEntity<ApiResponse<Void>> removeWishlist(@PathVariable Long productId) {
        String memberId = SecurityUtil.getCurrentMemberId();
        wishlistService.removeWishlist(memberId, productId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 위시리스트 (마이페이지) ──────────────────────────────

    @GetMapping("/api/members/mypage/wishlist")
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse.Summary>>> getMyWishlist(
            @PageableDefault(size = 15) Pageable pageable) {
        String memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(ApiResponse.success(wishlistService.getMyWishlist(memberId, pageable)));
    }

}
