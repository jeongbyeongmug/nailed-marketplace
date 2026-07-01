package com.nailed.web.admin.service;

import com.nailed.common.enums.ProductStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.web.admin.dto.AdminDashboardResponse;
import com.nailed.web.admin.dto.AdminDashboardTrendResponse;
import com.nailed.web.inquiry.repository.InquiryRepository;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.order.repository.OrderRepository;
import com.nailed.web.product.repository.ProductRepository;
import com.nailed.web.report.repository.ReportRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final String PERIOD_DAILY = "DAILY";
    private static final String PERIOD_MONTHLY = "MONTHLY";
    private static final int DEFAULT_DAILY_RANGE = 30;
    private static final int DEFAULT_MONTHLY_RANGE = 12;
    private static final int MAX_DAILY_RANGE = 90;
    private static final int MAX_MONTHLY_RANGE = 36;
    private static final DateTimeFormatter DAILY_LABEL_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter MONTHLY_LABEL_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final String MYSQL_DAILY_FORMAT = "%Y-%m-%d";
    private static final String MYSQL_MONTHLY_FORMAT = "%Y-%m";

    private final MemberRepository memberRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ReportRepository reportRepository;
    private final InquiryRepository inquiryRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public AdminDashboardResponse.Dashboard getDashboard() {
        return new AdminDashboardResponse.Dashboard(
                memberStats(),
                productStats(),
                orderStats(),
                salesStats(),
                reportStats(),
                inquiryStats(),
                categorySales(),
                productConditions(),
                popularProducts(),
                recentOrders(),
                recentReports(),
                recentProducts(),
                recentMembers()
        );
    }

    public AdminDashboardTrendResponse getDashboardTrends(String period, Integer range) {
        String normalizedPeriod = normalizePeriod(period);
        int normalizedRange = normalizeRange(normalizedPeriod, range);
        TrendRange trendRange = buildTrendRange(normalizedPeriod, normalizedRange);

        Map<String, Long> members = toValueMap(memberRepository.countUserMembersByPeriod(
                trendRange.dateFormat(), trendRange.startAt(), trendRange.endAt()));
        Map<String, Long> sales = toValueMap(orderRepository.sumSalesByRequestedPeriod(
                trendRange.dateFormat(), trendRange.startAt(), trendRange.endAt()));
        Map<String, Long> transactionAmounts = toValueMap(orderRepository.sumTransactionAmountByRequestedPeriod(
                trendRange.dateFormat(), trendRange.startAt(), trendRange.endAt()));
        Map<String, Long> orders = toValueMap(orderRepository.countOrdersByRequestedPeriod(
                trendRange.dateFormat(), trendRange.startAt(), trendRange.endAt()));
        Map<String, Long> reports = toValueMap(reportRepository.countReportsByPeriod(
                trendRange.dateFormat(), trendRange.startAt(), trendRange.endAt()));
        Map<String, Long> inquiries = toValueMap(inquiryRepository.countInquiriesByPeriod(
                trendRange.dateFormat(), trendRange.startAt(), trendRange.endAt()));
        Map<String, Long> onSaleProducts = toValueMap(productRepository.countOnSaleProductsByPeriod(
                trendRange.dateFormat(), trendRange.startAt(), trendRange.endAt(),
                ProductStatus.ON_SALE.name()));

        List<AdminDashboardTrendResponse.TrendPoint> points = trendRange.labels().stream()
                .map(label -> new AdminDashboardTrendResponse.TrendPoint(
                        label,
                        members.getOrDefault(label, 0L),
                        sales.getOrDefault(label, 0L),
                        transactionAmounts.getOrDefault(label, 0L),
                        orders.getOrDefault(label, 0L),
                        reports.getOrDefault(label, 0L),
                        inquiries.getOrDefault(label, 0L),
                        onSaleProducts.getOrDefault(label, 0L)
                ))
                .toList();

        return new AdminDashboardTrendResponse(normalizedPeriod, normalizedRange, points);
    }

    private AdminDashboardResponse.MemberStats memberStats() {
        return new AdminDashboardResponse.MemberStats(
                count("SELECT COUNT(*) FROM members"),
                count("SELECT COUNT(*) FROM members WHERE role = 'USER'"),
                count("SELECT COUNT(*) FROM members WHERE role = 'ADMIN'"),
                count("SELECT COUNT(*) FROM members WHERE member_status = 'ACTIVE'"),
                count("SELECT COUNT(*) FROM members WHERE member_status = 'LOCKED'"),
                count("SELECT COUNT(*) FROM members WHERE member_status IN ('WITHDRAWN', 'WITHDRAW')"),
                count("SELECT COUNT(*) FROM members WHERE member_status IN ('SUSPEND', 'SUSPENDED')"),
                count("SELECT COUNT(*) FROM members WHERE member_status = 'BANNED'")
        );
    }

    private AdminDashboardResponse.ProductStats productStats() {
        return new AdminDashboardResponse.ProductStats(
                count("SELECT COUNT(*) FROM products"),
                count("SELECT COUNT(*) FROM products WHERE product_status = 'ON_SALE'"),
                count("SELECT COUNT(*) FROM products WHERE product_status = 'SOLD'"),
                count("SELECT COUNT(*) FROM products WHERE product_status = 'DELETED'")
        );
    }

    private AdminDashboardResponse.OrderStats orderStats() {
        return new AdminDashboardResponse.OrderStats(
                count("SELECT COUNT(*) FROM orders"),
                count("SELECT COUNT(*) FROM orders WHERE order_status = 'REQUESTED'"),
                count("SELECT COUNT(*) FROM orders WHERE order_status = 'PAID'"),
                count("SELECT COUNT(*) FROM orders WHERE order_status = 'SHIPPING'"),
                count("SELECT COUNT(*) FROM orders WHERE order_status = 'DELIVERED'"),
                count("SELECT COUNT(*) FROM orders WHERE order_status = 'CANCELLED'")
        );
    }

    private AdminDashboardResponse.SalesStats salesStats() {
        Object[] row = singleRow("""
                SELECT COUNT(*),
                       COALESCE(SUM(ROUND((final_price * commission / 100), -1)), 0),
                       COALESCE(SUM(final_price), 0)
                FROM orders
                WHERE order_status IN ('REQUESTED', 'SHIPPING', 'DELIVERED')
                """);
        return new AdminDashboardResponse.SalesStats(
                number(row[0]).longValue(),
                number(row[1]).longValue(),
                number(row[2]).longValue()
        );
    }

    private AdminDashboardResponse.ReportStats reportStats() {
        return new AdminDashboardResponse.ReportStats(
                count("SELECT COUNT(*) FROM reports"),
                count("SELECT COUNT(*) FROM reports WHERE report_status = 'APPROVED'"),
                count("SELECT COUNT(*) FROM reports WHERE report_status = 'REJECTED'"),
                count("SELECT COUNT(*) FROM reports WHERE report_status = 'DONE'")
        );
    }

    private AdminDashboardResponse.InquiryStats inquiryStats() {
        return new AdminDashboardResponse.InquiryStats(
                count("SELECT COUNT(*) FROM inquiries"),
                count("SELECT COUNT(*) FROM inquiries WHERE inquiry_status = 'PENDING'"),
                count("SELECT COUNT(*) FROM inquiries WHERE inquiry_status = 'ANSWERED'")
        );
    }

    private List<AdminDashboardResponse.CategorySales> categorySales() {
        // 상품 카테고리는 최대 3단계(대분류>중분류>세부)이므로 상위로 끌어올려 대분류로 묶는다.
        return rows("""
                SELECT COALESCE(top.name, mid.name, leaf.name) AS big_category,
                       COUNT(DISTINCT p.product_id) AS product_count,
                       COUNT(DISTINCT CASE WHEN o.order_status IN ('REQUESTED', 'SHIPPING', 'DELIVERED')
                                           THEN o.order_id END) AS order_count,
                       COALESCE(SUM(CASE WHEN o.order_status IN ('REQUESTED', 'SHIPPING', 'DELIVERED')
                                         THEN o.final_price ELSE 0 END), 0) AS amount
                FROM products p
                JOIN product_groups leaf ON leaf.group_id = p.category_id
                LEFT JOIN product_groups mid ON mid.group_id = leaf.parent_id
                LEFT JOIN product_groups top ON top.group_id = mid.parent_id
                LEFT JOIN orders o ON o.product_id = p.product_id
                GROUP BY COALESCE(top.name, mid.name, leaf.name)
                ORDER BY product_count DESC
                """).stream()
                .map(row -> new AdminDashboardResponse.CategorySales(
                        string(row[0]),
                        number(row[1]).longValue(),
                        number(row[2]).longValue(),
                        number(row[3]).longValue()
                ))
                .toList();
    }

    private List<AdminDashboardResponse.ConditionCount> productConditions() {
        return rows("""
                SELECT condition_code, COUNT(*)
                FROM products
                GROUP BY condition_code
                ORDER BY COUNT(*) DESC
                """).stream()
                .map(row -> new AdminDashboardResponse.ConditionCount(
                        string(row[0]),
                        number(row[1]).longValue()
                ))
                .toList();
    }

    private List<AdminDashboardResponse.PopularProduct> popularProducts() {
        return rows("""
                SELECT title, view_count
                FROM products
                ORDER BY view_count DESC
                LIMIT 5
                """).stream()
                .map(row -> new AdminDashboardResponse.PopularProduct(
                        string(row[0]),
                        number(row[1]).longValue()
                ))
                .toList();
    }

    private List<AdminDashboardResponse.RecentOrder> recentOrders() {
        return rows("""
                SELECT o.order_id, p.title, buyer.nickname, seller.nickname,
                       o.order_status, o.final_price, o.paid_at
                FROM orders o
                LEFT JOIN products p ON p.product_id = o.product_id
                LEFT JOIN members buyer ON buyer.member_id = o.buyer_id
                LEFT JOIN members seller ON seller.member_id = o.seller_id
                ORDER BY o.paid_at DESC
                LIMIT 5
                """).stream()
                .map(row -> new AdminDashboardResponse.RecentOrder(
                        string(row[0]),
                        string(row[1]),
                        string(row[2]),
                        string(row[3]),
                        string(row[4]),
                        integer(row[5]),
                        time(row[6])
                ))
                .toList();
    }

    private List<AdminDashboardResponse.RecentReport> recentReports() {
        return rows("""
                SELECT r.report_id, reporter.nickname, target.nickname,
                       r.reason_code, r.report_status, r.created_at
                FROM reports r
                LEFT JOIN members reporter ON reporter.member_id = r.reporter_id
                LEFT JOIN members target ON target.member_id = r.target_member_id
                ORDER BY r.created_at DESC
                LIMIT 5
                """).stream()
                .map(row -> new AdminDashboardResponse.RecentReport(
                        string(row[0]),
                        string(row[1]),
                        string(row[2]),
                        string(row[3]),
                        string(row[4]),
                        time(row[5])
                ))
                .toList();
    }

    private List<AdminDashboardResponse.RecentProduct> recentProducts() {
        return rows("""
                SELECT p.product_id, p.title, p.product_status, p.price,
                       pi.image_url, p.created_at
                FROM products p
                LEFT JOIN product_images pi
                    ON pi.product_id = p.product_id AND pi.sort_order = 0
                ORDER BY p.created_at DESC
                LIMIT 5
                """).stream()
                .map(row -> new AdminDashboardResponse.RecentProduct(
                        number(row[0]).longValue(),
                        string(row[1]),
                        string(row[2]),
                        integer(row[3]),
                        string(row[4]),
                        time(row[5])
                ))
                .toList();
    }

    private List<AdminDashboardResponse.RecentMember> recentMembers() {
        return rows("""
                SELECT member_id, userid, nickname, role, member_status, created_at
                FROM members
                ORDER BY created_at DESC
                LIMIT 5
                """).stream()
                .map(row -> new AdminDashboardResponse.RecentMember(
                        string(row[0]),
                        string(row[1]),
                        string(row[2]),
                        string(row[3]),
                        string(row[4]),
                        time(row[5])
                ))
                .toList();
    }

    private String normalizePeriod(String period) {
        if (period == null || period.isBlank()) {
            return PERIOD_DAILY;
        }
        String value = period.trim().toUpperCase();
        if (PERIOD_DAILY.equals(value) || PERIOD_MONTHLY.equals(value)) {
            return value;
        }
        throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    private int normalizeRange(String period, Integer range) {
        int defaultRange = PERIOD_MONTHLY.equals(period) ? DEFAULT_MONTHLY_RANGE : DEFAULT_DAILY_RANGE;
        int maxRange = PERIOD_MONTHLY.equals(period) ? MAX_MONTHLY_RANGE : MAX_DAILY_RANGE;
        if (range == null) {
            return defaultRange;
        }
        if (range < 1) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
        return Math.min(range, maxRange);
    }

    private TrendRange buildTrendRange(String period, int range) {
        if (PERIOD_MONTHLY.equals(period)) {
            YearMonth currentMonth = YearMonth.now();
            YearMonth startMonth = currentMonth.minusMonths(range - 1L);
            LocalDateTime startAt = startMonth.atDay(1).atStartOfDay();
            LocalDateTime endAt = currentMonth.plusMonths(1).atDay(1).atStartOfDay();
            List<String> labels = new ArrayList<>();
            for (int i = 0; i < range; i++) {
                labels.add(startMonth.plusMonths(i).format(MONTHLY_LABEL_FORMAT));
            }
            return new TrendRange(MYSQL_MONTHLY_FORMAT, startAt, endAt, labels);
        }

        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(range - 1L);
        LocalDateTime startAt = startDate.atStartOfDay();
        LocalDateTime endAt = today.plusDays(1).atStartOfDay();
        List<String> labels = new ArrayList<>();
        for (int i = 0; i < range; i++) {
            labels.add(startDate.plusDays(i).format(DAILY_LABEL_FORMAT));
        }
        return new TrendRange(MYSQL_DAILY_FORMAT, startAt, endAt, labels);
    }

    private Map<String, Long> toValueMap(List<Object[]> rows) {
        Map<String, Long> values = new HashMap<>();
        for (Object[] row : rows) {
            String label = string(row[0]);
            if (label != null) {
                values.put(label, number(row[1]).longValue());
            }
        }
        return values;
    }

    private long count(String sql) {
        return number(entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }

    private Object[] singleRow(String sql) {
        return (Object[]) entityManager.createNativeQuery(sql).getSingleResult();
    }

    private List<Object[]> rows(String sql) {
        Query query = entityManager.createNativeQuery(sql);
        List<?> raw = query.getResultList();
        List<Object[]> rows = new ArrayList<>();
        for (Object row : raw) {
            rows.add((Object[]) row);
        }
        return rows;
    }

    private Number number(Object value) {
        return (Number) value;
    }

    private Integer integer(Object value) {
        return value != null ? number(value).intValue() : null;
    }

    private String string(Object value) {
        return value != null ? value.toString() : null;
    }

    private LocalDateTime time(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        return null;
    }

    private record TrendRange(
            String dateFormat,
            LocalDateTime startAt,
            LocalDateTime endAt,
            List<String> labels
    ) {}
}
