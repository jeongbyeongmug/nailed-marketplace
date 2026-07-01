package com.nailed.web.admin.controller;

import com.nailed.common.response.ApiResponse;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminProductHideRequest;
import com.nailed.web.admin.dto.AdminProductResponse;
import com.nailed.web.admin.service.AdminProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final AdminProductService adminProductService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminProductResponse.Summary>>> getProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String productStatus,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String brandCode,
            @RequestParam(required = false) String brandName,
            @RequestParam(required = false) String sellerKeyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminProductService.getProducts(
                keyword,
                productStatus,
                categoryId,
                categoryCode,
                brandCode,
                brandName,
                sellerKeyword,
                pageable
        )));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ApiResponse<AdminProductResponse.Detail>> getProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(ApiResponse.success(adminProductService.getProduct(productId)));
    }

    @PatchMapping("/{productId}/delete")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @PathVariable Long productId,
            @Valid @RequestBody AdminProductHideRequest request) {
        adminProductService.deleteProduct(productId, request.reason());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{productId}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreProduct(@PathVariable Long productId) {
        adminProductService.restoreProduct(productId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
