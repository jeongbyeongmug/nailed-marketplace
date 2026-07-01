package com.nailed.web.order.repository;
import com.nailed.web.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.time.LocalDateTime;

public interface OrderRepository extends JpaRepository<Order, String> {
    // 판매자의 거래완료(DELIVERED) 건수 → 판매자 등급 산정용
    long countBySellerIdAndOrderStatus(String sellerId, String orderStatus);
    // 특정 상품의 진행중 거래 존재 여부 → 상품 삭제 불가 체크용
    boolean existsByProductIdAndOrderStatusIn(Long productId, List<String> statuses);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE orders SET order_status = 'CANCELLED', previous_status = order_status, " +
                   "cancel_request_status = 'APPROVED', cancelled_at = NOW(), cancel_responded_at = NOW() " +
                   "WHERE order_id = :orderId", nativeQuery = true)
    void cancelOrder(@Param("orderId") String orderId);

    // 관리자 주문 목록 검색: 주문번호/구매자·판매자 아이디·닉네임/상품명 키워드 + 주문상태/기간 필터 (페이징)
    @Query(value = """
            SELECT o FROM Order o
            JOIN Member buyer ON buyer.memberId = o.buyerId
            JOIN Member seller ON seller.memberId = o.sellerId
            JOIN Product product ON product.productId = o.productId
            WHERE (:keyword IS NULL
                OR LOWER(o.orderId) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(buyer.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(buyer.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(seller.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(seller.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(product.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:orderStatus IS NULL OR o.orderStatus = :orderStatus)
              AND (:dateFrom IS NULL OR o.paidAt >= :dateFrom)
              AND (:dateTo IS NULL OR o.paidAt <= :dateTo)
            """,
           countQuery = """
            SELECT COUNT(o) FROM Order o
            JOIN Member buyer ON buyer.memberId = o.buyerId
            JOIN Member seller ON seller.memberId = o.sellerId
            JOIN Product product ON product.productId = o.productId
            WHERE (:keyword IS NULL
                OR LOWER(o.orderId) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(buyer.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(buyer.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(seller.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(seller.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(product.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:orderStatus IS NULL OR o.orderStatus = :orderStatus)
              AND (:dateFrom IS NULL OR o.paidAt >= :dateFrom)
              AND (:dateTo IS NULL OR o.paidAt <= :dateTo)
            """)
    Page<Order> searchAdminOrders(
            @Param("keyword") String keyword,
            @Param("orderStatus") String orderStatus,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable);

    // 관리자 대시보드용 기간별 매출(수수료 수익) 합계 (주문접수 이후 상태만 집계, final_price * commission(%) / 100을 10원 단위로 반올림)
    @Query(value = """
            SELECT DATE_FORMAT(requested_at, :dateFormat) AS label,
                   COALESCE(SUM(ROUND((final_price * commission / 100), -1)), 0) AS sales
            FROM orders
            WHERE order_status IN ('REQUESTED', 'SHIPPING', 'DELIVERED')
              AND requested_at IS NOT NULL
              AND requested_at >= :startAt
              AND requested_at < :endAt
            GROUP BY DATE_FORMAT(requested_at, :dateFormat)
            """, nativeQuery = true)
    List<Object[]> sumSalesByRequestedPeriod(
            @Param("dateFormat") String dateFormat,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt);

    // 관리자 대시보드용 기간별 거래액(최종 결제금액) 합계 (주문접수 이후 상태만 집계)
    @Query(value = """
            SELECT DATE_FORMAT(requested_at, :dateFormat) AS label,
                   COALESCE(SUM(final_price), 0) AS transactionAmount
            FROM orders
            WHERE order_status IN ('REQUESTED', 'SHIPPING', 'DELIVERED')
              AND requested_at IS NOT NULL
              AND requested_at >= :startAt
              AND requested_at < :endAt
            GROUP BY DATE_FORMAT(requested_at, :dateFormat)
            """, nativeQuery = true)
    List<Object[]> sumTransactionAmountByRequestedPeriod(
            @Param("dateFormat") String dateFormat,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt);

    // 관리자 대시보드용 기간별 주문 건수 (주문접수 이후 상태만 집계)
    @Query(value = """
            SELECT DATE_FORMAT(requested_at, :dateFormat) AS label, COUNT(*) AS count
            FROM orders
            WHERE order_status IN ('REQUESTED', 'SHIPPING', 'DELIVERED')
              AND requested_at IS NOT NULL
              AND requested_at >= :startAt
              AND requested_at < :endAt
            GROUP BY DATE_FORMAT(requested_at, :dateFormat)
            """, nativeQuery = true)
    List<Object[]> countOrdersByRequestedPeriod(
            @Param("dateFormat") String dateFormat,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt);
}

