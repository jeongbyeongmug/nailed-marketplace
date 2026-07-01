package com.nailed.web.product.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductSearchCondition {
    private Long categoryId;
    private String categoryCode;
    private String keyword;
    private Integer minPrice;
    private Integer maxPrice;
    private String gender;
    private boolean excludeSold = false;
    private String productSize;
    private String conditionCode;
    private String sortBy = "latest";
}
