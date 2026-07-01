package com.nailed.web.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AdminDashboardResponse {

    public record Dashboard(
            MemberStats members,
            ProductStats products,
            OrderStats orders,
            SalesStats sales,
            ReportStats reports,
            InquiryStats inquiries,
            List<CategorySales> categorySales,
            List<ConditionCount> productConditions,
            List<PopularProduct> popularProducts,
            List<RecentOrder> recentOrders,
            List<RecentReport> recentReports,
            List<RecentProduct> recentProducts,
            List<RecentMember> recentMembers
    ) {}

    public record MemberStats(
            long totalMembers,
            long userMembers,
            long adminMembers,
            long activeMembers,
            long lockedMembers,
            long withdrawnMembers,
            long suspendedMembers,
            long bannedMembers
    ) {}

    public record ProductStats(
            long totalProducts,
            long onSaleProducts,
            long soldProducts,
            long deletedProducts
    ) {}

    public record OrderStats(
            long totalOrders,
            long requestedOrders,
            long paidOrders,
            long shippingOrders,
            long deliveredOrders,
            long cancelledOrders
    ) {}

    public record SalesStats(
            long deliveredOrderCount,
            long commissionRevenue,
            long transactionAmount
    ) {}

    public record ReportStats(
            long totalReports,
            long approvedReports,   // 처리 대기 (APPROVED = 접수됨)
            long rejectedReports,
            long doneReports
    ) {}

    public record InquiryStats(
            long totalInquiries,
            long pendingInquiries,
            long answeredInquiries
    ) {}

    // 대분류 카테고리별 상품 수 / 유효 주문 수 / 거래액
    public record CategorySales(
            String category,
            long productCount,
            long orderCount,
            long amount
    ) {}

    // 상품 컨디션(S/A/B/C/D)별 상품 수
    public record ConditionCount(
            String conditionCode,
            long count
    ) {}

    // 조회수 상위 인기 상품
    public record PopularProduct(
            String title,
            long viewCount
    ) {}

    public record RecentOrder(
            String orderId,
            String productTitle,
            String buyerNickname,
            String sellerNickname,
            String orderStatus,
            Integer finalPrice,
            LocalDateTime paidAt
    ) {}

    public record RecentReport(
            String reportId,
            String reporterNickname,
            String targetName,
            String reasonCode,
            String status,
            LocalDateTime createdAt
    ) {}

    public record RecentProduct(
            Long productId,
            String title,
            String productStatus,
            Integer price,
            String thumbnailUrl,
            LocalDateTime createdAt
    ) {}

    public record RecentMember(
            String memberId,
            String userid,
            String nickname,
            String role,
            String status,
            LocalDateTime createdAt
    ) {}
}
