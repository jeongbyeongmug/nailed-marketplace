package com.nailed.web.admin.service;

import com.nailed.common.enums.ProductStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.web.admin.dto.AdminProductResponse;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.entity.ProductGroup;
import com.nailed.web.product.repository.ProductImageRepository;
import com.nailed.web.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminProductService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;

    public PageResponse<AdminProductResponse.Summary> getProducts(
            String keyword,
            String productStatus,
            Long categoryId,
            String categoryCode,
            String brandCode,
            String brandName,
            String sellerKeyword,
            Pageable pageable) {
        Page<Product> page = productRepository.searchAdminProducts(
                blankToNull(keyword),
                parseProductStatus(productStatus),
                categoryId,
                blankToNull(categoryCode),
                blankToNull(brandCode),
                blankToNull(brandName),
                blankToNull(sellerKeyword),
                pageable
        );
        List<Long> productIds = new ArrayList<>();
        for (Product product : page.getContent()) {
            productIds.add(product.getProductId());
        }
        Map<Long, String> thumbnailMap = productImageRepository.buildThumbnailMap(productIds);

        return PageResponse.of(page.map(product ->
                toSummary(product, thumbnailMap.get(product.getProductId()))));
    }

    public AdminProductResponse.Detail getProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new CustomException(ErrorCode.PRODUCT_NOT_FOUND));

        List<String> imageUrls = productImageRepository
                .findByProductProductIdOrderBySortOrderAsc(productId)
                .stream()
                .map(img -> img.getImageUrl())
                .toList();

        ProductGroup brand = product.getBrand();
        ProductGroup category = product.getCategory();
        return new AdminProductResponse.Detail(
                product.getProductId(),
                product.getTitle(),
                brand != null ? brand.getName() : null,
                category.getName(),
                category.buildCategoryPath(),
                product.getPrice(),
                product.getShippingFee(),
                product.getShippingMethod(),
                product.getConditionCode().name(),
                product.getProductStatus().name(),
                product.getSize(),
                product.getHashtags(),
                product.getDescription(),
                product.getViewCount(),
                product.getWishlistCount(),
                product.getSeller().getMemberId(),
                product.getSeller().getUserid(),
                product.getSeller().getNickname(),
                imageUrls,
                product.getCreatedAt(),
                product.getUpdatedAt(),
                product.getDeletedReason(),
                product.getDeletedAt()
        );
    }

    @Transactional
    public void deleteProduct(Long productId, String reason) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new CustomException(ErrorCode.PRODUCT_NOT_FOUND));

        if (product.getProductStatus() == ProductStatus.DELETED) {
            throw new CustomException(ErrorCode.PRODUCT_DELETED);
        }

        product.delete(blankToNull(reason));
    }

    @Transactional
    public void restoreProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new CustomException(ErrorCode.PRODUCT_NOT_FOUND));

        if (product.getProductStatus() != ProductStatus.DELETED) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }

        productRepository.restoreProductById(productId, ProductStatus.ON_SALE);
    }

    private AdminProductResponse.Summary toSummary(Product product, String thumbnailUrl) {
        ProductGroup brand = product.getBrand();
        ProductGroup category = product.getCategory();
        return new AdminProductResponse.Summary(
                product.getProductId(),
                product.getTitle(),
                brand != null ? brand.getName() : null,
                category.getName(),
                category.buildCategoryPath(),
                product.getPrice(),
                product.getProductStatus().name(),
                product.getViewCount(),
                product.getWishlistCount(),
                product.getSeller().getMemberId(),
                product.getSeller().getUserid(),
                product.getSeller().getNickname(),
                thumbnailUrl,
                product.getCreatedAt(),
                product.getUpdatedAt(),
                product.getDeletedReason()
        );
    }

    private ProductStatus parseProductStatus(String productStatus) {
        String value = blankToNull(productStatus);
        if (value == null) {
            return null;
        }
        try {
            return ProductStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private String blankToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
