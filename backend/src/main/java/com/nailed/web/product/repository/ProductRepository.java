package com.nailed.web.product.repository;

import com.nailed.common.enums.ProductCondition;
import com.nailed.common.enums.ProductStatus;
import com.nailed.web.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // 비관적 쓰기 락 - 주문 결제 시 동시 구매 방지용
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.productId = :productId")
    Optional<Product> findByIdWithLock(@Param("productId") Long productId);

    // 삭제된 상품 제외 단건 조회 (수정/삭제/상태변경 등 소유자 액션·찜 등록용)
    Optional<Product> findByProductIdAndProductStatusNot(Long productId, ProductStatus status);

    // 상세 페이지 전용 - seller/category 계층/brand 한 번에 fetch
    @Query("SELECT p FROM Product p " +
           "JOIN FETCH p.seller " +
           "JOIN FETCH p.category c " +
           "LEFT JOIN FETCH c.parent cp " +
           "LEFT JOIN FETCH cp.parent " +
           "LEFT JOIN FETCH p.brand " +
           "WHERE p.productId = :id AND p.productStatus != :deleted")
    Optional<Product> findByIdWithFetch(@Param("id") Long id, @Param("deleted") ProductStatus deleted);

    @Query(value = "SELECT p FROM Product p " +
                   "LEFT JOIN p.category c " +
                   "LEFT JOIN c.parent cp " +
                   "LEFT JOIN cp.parent cpp " +
                   "WHERE (p.productStatus = :onSale OR (:excludeSold = false AND p.productStatus = :sold)) " +
                   "AND p.deletedAt IS NULL " +
                   "AND (:categoryId IS NULL OR c.groupId = :categoryId) " +
                   "AND (:categoryCodePrefix IS NULL OR c.code LIKE CONCAT(:categoryCodePrefix, '%') " +
                   "OR cp.code LIKE CONCAT(:categoryCodePrefix, '%') " +
                   "OR cpp.code LIKE CONCAT(:categoryCodePrefix, '%')) " +
                   "AND (:genderCodePrefix IS NULL OR c.code LIKE CONCAT(:genderCodePrefix, '%') " +
                   "OR cp.code LIKE CONCAT(:genderCodePrefix, '%') " +
                   "OR cpp.code LIKE CONCAT(:genderCodePrefix, '%')) " +
                   "AND (:minPrice IS NULL OR p.price >= :minPrice) " +
                   "AND (:maxPrice IS NULL OR p.price <= :maxPrice) " +
                   "AND (:conditionCode IS NULL OR p.conditionCode = :conditionCode) " +
                   "AND (:productSize IS NULL OR p.size = :productSize)")
    Page<Product> findCategoryProducts(@Param("onSale") ProductStatus onSale,
                                       @Param("sold") ProductStatus sold,
                                       @Param("excludeSold") boolean excludeSold,
                                       @Param("categoryId") Long categoryId,
                                       @Param("categoryCodePrefix") String categoryCodePrefix,
                                       @Param("genderCodePrefix") String genderCodePrefix,
                                       @Param("minPrice") Integer minPrice,
                                       @Param("maxPrice") Integer maxPrice,
                                       @Param("conditionCode") ProductCondition conditionCode,
                                       @Param("productSize") String productSize,
                                       Pageable pageable);

    @Query(value = "SELECT p FROM Product p " +
                   "LEFT JOIN p.category c " +
                   "LEFT JOIN c.parent cp " +
                   "LEFT JOIN cp.parent cpp " +
                   "WHERE (p.productStatus = :onSale OR (:excludeSold = false AND p.productStatus = :sold)) " +
                   "AND p.deletedAt IS NULL " +
                   "AND (:categoryId IS NULL OR c.groupId = :categoryId) " +
                   "AND (:categoryCodePrefix IS NULL OR c.code LIKE CONCAT(:categoryCodePrefix, '%') " +
                   "OR cp.code LIKE CONCAT(:categoryCodePrefix, '%') " +
                   "OR cpp.code LIKE CONCAT(:categoryCodePrefix, '%')) " +
                   "AND (:genderCodePrefix IS NULL OR c.code LIKE CONCAT(:genderCodePrefix, '%') " +
                   "OR cp.code LIKE CONCAT(:genderCodePrefix, '%') " +
                   "OR cpp.code LIKE CONCAT(:genderCodePrefix, '%')) " +
                   "AND (:minPrice IS NULL OR p.price >= :minPrice) " +
                   "AND (:maxPrice IS NULL OR p.price <= :maxPrice) " +
                   "AND (:conditionCode IS NULL OR p.conditionCode = :conditionCode) " +
                   "AND (:productSize IS NULL OR p.size = :productSize) " +
                   "ORDER BY (p.viewCount + p.wishlistCount * 3) DESC")
    Page<Product> findCategoryProductsOrderByPopular(@Param("onSale") ProductStatus onSale,
                                                     @Param("sold") ProductStatus sold,
                                                     @Param("excludeSold") boolean excludeSold,
                                                     @Param("categoryId") Long categoryId,
                                                     @Param("categoryCodePrefix") String categoryCodePrefix,
                                                     @Param("genderCodePrefix") String genderCodePrefix,
                                                     @Param("minPrice") Integer minPrice,
                                                     @Param("maxPrice") Integer maxPrice,
                                                     @Param("conditionCode") ProductCondition conditionCode,
                                                     @Param("productSize") String productSize,
                                                     Pageable pageable);

    // 내 판매 상품 - 특정 상태
    Page<Product> findBySellerMemberIdAndProductStatus(String memberId, ProductStatus status, Pageable pageable);

    // 내 판매 상품 - 전체 (삭제 제외)
    Page<Product> findBySellerMemberIdAndProductStatusNot(String memberId, ProductStatus status, Pageable pageable);

    // Admin dashboard: ON_SALE 상품 기간별 등록 수
    @Query(value = """
            SELECT DATE_FORMAT(created_at, :dateFormat) AS label, COUNT(*) AS count
            FROM products
            WHERE product_status = :status
              AND deleted_at IS NULL
              AND created_at >= :startAt
              AND created_at < :endAt
            GROUP BY DATE_FORMAT(created_at, :dateFormat)
            """, nativeQuery = true)
    List<Object[]> countOnSaleProductsByPeriod(
            @Param("dateFormat") String dateFormat,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt,
            @Param("status") String status);

    // 조회수 +1 (DB에서 직접 덧셈 → Lost Update 방지, 삭제 상품 제외)
    // 반환값: 실제 업데이트된 행 수 (0이면 존재하지 않거나 삭제된 상품)
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE Product p SET p.viewCount = p.viewCount + 1 " +
           "WHERE p.productId = :productId AND p.productStatus != :deleted")
    int incrementViewCount(@Param("productId") Long productId,
                           @Param("deleted") ProductStatus deleted);

    // 찜수 +1 (DB에서 직접 덧셈 → 동시 찜 Lost Update 방지)
    // flushAutomatically: bulk UPDATE 전에 pending 변경(찜 INSERT 등)을 먼저 DB 반영
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query("UPDATE Product p SET p.wishlistCount = p.wishlistCount + 1 WHERE p.productId = :productId")
    int incrementWishlistCount(@Param("productId") Long productId);

    // 찜수 -1 (0 미만 방지 가드 유지, 동시 찜취소 Lost Update 방지)
    // flushAutomatically: clear 전에 pending 찜 DELETE를 먼저 DB 반영 (DELETE 유실 방지)
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query("UPDATE Product p SET p.wishlistCount = p.wishlistCount - 1 " +
           "WHERE p.productId = :productId AND p.wishlistCount > 0")
    int decrementWishlistCount(@Param("productId") Long productId);

    // 판매자의 다른 상품 (현재 상품 제외, 최신순)
    @Query("SELECT p FROM Product p WHERE p.seller.memberId = :sellerId AND p.productId != :excludeId AND p.productStatus != :deleted ORDER BY p.createdAt DESC")
    List<Product> findSellerProducts(@Param("sellerId") String sellerId,
                                     @Param("excludeId") Long excludeId,
                                     @Param("deleted") ProductStatus deleted,
                                     Pageable pageable);

    // 같은 카테고리 다른 상품 (현재 상품 제외, ON_SALE만, 최신순) — "비슷한 상품" 섹션
    @Query("SELECT p FROM Product p WHERE p.category.groupId = :categoryId AND p.productId != :excludeId AND p.productStatus = :onSale ORDER BY p.createdAt DESC")
    List<Product> findRelatedProducts(@Param("categoryId") Long categoryId,
                                      @Param("excludeId") Long excludeId,
                                      @Param("onSale") ProductStatus onSale,
                                      Pageable pageable);

    // 홈 추천: 최신 ON_SALE 6개
    List<Product> findTop6ByProductStatusOrderByCreatedAtDesc(ProductStatus status);

    // 홈 인기 TOP 5: 인기점수(조회수×1 + 찜수×3) 기준
    @Query(value = "SELECT * FROM products WHERE product_status = :status " +
                   "ORDER BY (view_count + wishlist_count * 3) DESC LIMIT 5",
           nativeQuery = true)
    List<Product> findPopularTop5(@Param("status") String status);

    // 검색 + 다중 필터 (keyword / 카테고리 / 가격범위 / 상태등급 / 사이즈)
    // :param IS NULL 패턴으로 파라미터가 null이면 해당 조건을 무시
    @Query(value = "SELECT p FROM Product p " +
                   "LEFT JOIN p.brand b " +
                   "LEFT JOIN p.category c " +
                   "WHERE (p.productStatus = :onSale OR (:excludeSold = false AND p.productStatus = :sold)) " +
                   "AND p.deletedAt IS NULL " +
                   "AND (:categoryId IS NULL OR c.groupId = :categoryId) " +
                   "AND (:categoryCodePrefix IS NULL OR c.code LIKE CONCAT(:categoryCodePrefix, '%')) " +
                   "AND (:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(b.code) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(p.hashtags) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                   "AND (:minPrice IS NULL OR p.price >= :minPrice) " +
                   "AND (:maxPrice IS NULL OR p.price <= :maxPrice) " +
                   "AND (:conditionCode IS NULL OR p.conditionCode = :conditionCode) " +
                   "AND (:productSize IS NULL OR p.size = :productSize)")
    Page<Product> search(@Param("onSale") ProductStatus onSale,
                         @Param("sold") ProductStatus sold,
                         @Param("excludeSold") boolean excludeSold,
                         @Param("categoryId") Long categoryId,
                         @Param("categoryCodePrefix") String categoryCodePrefix,
                         @Param("keyword") String keyword,
                         @Param("minPrice") Integer minPrice,
                         @Param("maxPrice") Integer maxPrice,
                         @Param("conditionCode") ProductCondition conditionCode,
                         @Param("productSize") String productSize,
                         Pageable pageable);

    // 5개 메인 카테고리(MENS/WOMENS/LUXURY/ACC/IT) ON_SALE 랜덤 최대 50개
    // LIMIT에 named parameter 불가(MySQL 제약) → 고정 50으로 뽑고 서비스에서 slice
    @Query(value = "SELECT * FROM products " +
                   "WHERE product_status = :status " +
                   "AND category_id IN (" +
                   "    SELECT group_id FROM product_groups " +
                   "    WHERE code LIKE 'MENS%' OR code LIKE 'WOMENS%' " +
                   "    OR code LIKE 'LUXURY%' OR code LIKE 'ACC%' OR code LIKE 'IT%'" +
                   ") ORDER BY RAND() LIMIT 50",
           nativeQuery = true)
    List<Product> findRandomProducts(@Param("status") String status);

    // 인기순 전용 쿼리 (조회수×1 + 찜수×3)
    @Query(value = "SELECT p FROM Product p " +
                   "LEFT JOIN p.brand b " +
                   "LEFT JOIN p.category c " +
                   "WHERE (p.productStatus = :onSale OR (:excludeSold = false AND p.productStatus = :sold)) " +
                   "AND p.deletedAt IS NULL " +
                   "AND (:categoryId IS NULL OR c.groupId = :categoryId) " +
                   "AND (:categoryCodePrefix IS NULL OR c.code LIKE CONCAT(:categoryCodePrefix, '%')) " +
                   "AND (:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(b.code) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "OR LOWER(p.hashtags) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                   "AND (:minPrice IS NULL OR p.price >= :minPrice) " +
                   "AND (:maxPrice IS NULL OR p.price <= :maxPrice) " +
                   "AND (:conditionCode IS NULL OR p.conditionCode = :conditionCode) " +
                   "AND (:productSize IS NULL OR p.size = :productSize) " +
                   "ORDER BY (p.viewCount + p.wishlistCount * 3) DESC")
    Page<Product> searchOrderByPopular(@Param("onSale") ProductStatus onSale,
                                       @Param("sold") ProductStatus sold,
                                       @Param("excludeSold") boolean excludeSold,
                                       @Param("categoryId") Long categoryId,
                                       @Param("categoryCodePrefix") String categoryCodePrefix,
                                       @Param("keyword") String keyword,
                                       @Param("minPrice") Integer minPrice,
                                       @Param("maxPrice") Integer maxPrice,
                                       @Param("conditionCode") ProductCondition conditionCode,
                                       @Param("productSize") String productSize,
                                       Pageable pageable);

    @Query(value = """
            SELECT p FROM Product p
            JOIN FETCH p.seller s
            JOIN FETCH p.category c
            LEFT JOIN FETCH c.parent cp
            LEFT JOIN FETCH cp.parent
            LEFT JOIN FETCH p.brand b
            WHERE (:keyword IS NULL
                OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(b.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(s.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(s.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:productStatus IS NULL OR p.productStatus = :productStatus)
              AND (:categoryId IS NULL OR c.groupId = :categoryId)
              AND (:categoryCode IS NULL OR c.code LIKE CONCAT(:categoryCode, '%'))
              AND (:brandCode IS NULL OR b.code = :brandCode)
              AND (:brandName IS NULL OR LOWER(b.name) LIKE LOWER(CONCAT('%', :brandName, '%')))
              AND (:sellerKeyword IS NULL
                OR LOWER(s.userid) LIKE LOWER(CONCAT('%', :sellerKeyword, '%'))
                OR LOWER(s.nickname) LIKE LOWER(CONCAT('%', :sellerKeyword, '%')))
            """,
           countQuery = """
            SELECT COUNT(p) FROM Product p
            JOIN p.seller s
            JOIN p.category c
            LEFT JOIN p.brand b
            WHERE (:keyword IS NULL
                OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(b.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(s.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(s.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:productStatus IS NULL OR p.productStatus = :productStatus)
              AND (:categoryId IS NULL OR c.groupId = :categoryId)
              AND (:categoryCode IS NULL OR c.code LIKE CONCAT(:categoryCode, '%'))
              AND (:brandCode IS NULL OR b.code = :brandCode)
              AND (:brandName IS NULL OR LOWER(b.name) LIKE LOWER(CONCAT('%', :brandName, '%')))
              AND (:sellerKeyword IS NULL
                OR LOWER(s.userid) LIKE LOWER(CONCAT('%', :sellerKeyword, '%'))
                OR LOWER(s.nickname) LIKE LOWER(CONCAT('%', :sellerKeyword, '%')))
            """)
    Page<Product> searchAdminProducts(
            @Param("keyword") String keyword,
            @Param("productStatus") ProductStatus productStatus,
            @Param("categoryId") Long categoryId,
            @Param("categoryCode") String categoryCode,
            @Param("brandCode") String brandCode,
            @Param("brandName") String brandName,
            @Param("sellerKeyword") String sellerKeyword,
            Pageable pageable);
    // 상품 상태 변경 (결제완료 → SOLD / 주문취소 → ON_SALE 복구)
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query("UPDATE Product p SET p.productStatus = :status WHERE p.productId = :productId")
    int updateProductStatus(@Param("productId") Long productId,
                            @Param("status") ProductStatus status);

    // 관리자 복구: productStatus, deletedReason, deletedAt 동시 초기화
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE Product p SET p.productStatus = :status, p.deletedReason = null, p.deletedAt = null WHERE p.productId = :productId")
    int restoreProductById(@Param("productId") Long productId, @Param("status") ProductStatus status);
}
