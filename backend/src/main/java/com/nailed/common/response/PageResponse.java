package com.nailed.common.response;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 페이지네이션 공통 응답 포맷
 * Spring Data의 Page 객체 → 깔끔한 JSON으로 변환
 *
 * 사용법:
 *   Page<ProductDto> page = productService.getProducts(pageable);
 *   return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
 */
@Getter
public class PageResponse<T> {

    private final List<T> content;
    private final int pageNumber;
    private final int pageSize;
    private final long totalElements;
    private final int totalPages;
    private final boolean first;
    private final boolean last;

    private PageResponse(Page<T> page) {
        this.content       = page.getContent();
        this.pageNumber    = page.getNumber();
        this.pageSize      = page.getSize();
        this.totalElements = page.getTotalElements();
        this.totalPages    = page.getTotalPages();
        this.first         = page.isFirst();
        this.last          = page.isLast();
    }

    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(page);
    }
}
