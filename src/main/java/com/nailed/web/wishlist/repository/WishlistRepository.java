package com.nailed.web.wishlist.repository;

import com.nailed.common.enums.ProductStatus;
import com.nailed.web.wishlist.entity.Wishlist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long> {

    // 찜 중복 등록 차단용 존재 여부 확인
    boolean existsByMemberMemberIdAndProductProductId(String memberId, Long productId);

    // 찜 취소 시 삭제 대상 단건 조회
    Optional<Wishlist> findByMemberMemberIdAndProductProductId(String memberId, Long productId);

    // 내 찜 목록 (등록 순)
    // JOIN FETCH 로 Product 를 한 번에 로딩 → N+1 방지
    // countQuery 분리 → 페이징 카운트 쿼리에서 불필요한 JOIN 제거
    // DELETED 상품 제외, SOLD 는 포함(거래완료 배지 노출)
    @Query(value = "SELECT w FROM Wishlist w JOIN FETCH w.product p " +
                   "WHERE w.member.memberId = :memberId " +
                   "AND p.productStatus <> :deleted " +
                   "ORDER BY w.wishlistId DESC",
           countQuery = "SELECT COUNT(w) FROM Wishlist w " +
                        "WHERE w.member.memberId = :memberId " +
                        "AND w.product.productStatus <> :deleted")
    Page<Wishlist> findMyWishlist(@Param("memberId") String memberId,
                                  @Param("deleted") ProductStatus deleted,
                                  Pageable pageable);
}
