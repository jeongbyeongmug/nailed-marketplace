package com.nailed.web.admin.dto;

import java.util.List;

public record AdminDashboardTrendResponse(
        String period,
        int range,
        List<TrendPoint> points
) {

    public record TrendPoint(
            String label,
            Long members,
            Long sales,
            Long transactionAmount,
            Long orders,
            Long reports,
            Long inquiries,
            Long onSaleProducts
    ) {}
}
