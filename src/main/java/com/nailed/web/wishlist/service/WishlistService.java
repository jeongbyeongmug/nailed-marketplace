package com.nailed.web.wishlist.service;

import com.nailed.common.enums.ProductStatus;
import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.product.dto.ProductResponse;
import com.nailed.web.product.entity.Product;
import com.nailed.web.product.repository.ProductImageRepository;
import com.nailed.web.product.repository.ProductRepository;
import com.nailed.web.wishlist.entity.Wishlist;
import com.nailed.web.wishlist.repository.WishlistRepository;
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
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final MemberRepository memberRepository;

    // ── 찜 등록 ───────────────────────────────────────────────

    /**
     * 상품 상세에서 찜 버튼 클릭 시 호출
     * - 중복 등록 차단 (WISHLIST_ALREADY_EXISTS)
     * - products.wishlist_count +1 동기화
     */
    @Transactional
    public void addWishlist(String memberId, Long productId) {
        // 이미 찜한 상품이면 차단
        if (wishlistRepository.existsByMemberMemberIdAndProductProductId(memberId, productId)) {
            throw new CustomException(ErrorCode.WISHLIST_ALREADY_EXISTS);
        }

        Member member = findMember(memberId);
        Product product = findActiveProduct(productId);

        Wishlist wishlist = Wishlist.builder()
                .member(member)
                .product(product)
                .build();
        wishlistRepository.save(wishlist);

        // 상품 찜수 +1 (DB 원자적 증가 → 동시 찜 Lost Update 방지)
        productRepository.incrementWishlistCount(productId);
    }

    // ── 찜 취소 ───────────────────────────────────────────────

    /**
     * 찜 토글 OFF 시 호출
     * - 찜 내역 없으면 404 (WISHLIST_NOT_FOUND)
     * - products.wishlist_count -1 동기화 (0 미만 방지는 Product 메서드 내부)
     */
    @Transactional
    public void removeWishlist(String memberId, Long productId) {
        Wishlist wishlist = wishlistRepository
                .findByMemberMemberIdAndProductProductId(memberId, productId)
                .orElseThrow(() -> new CustomException(ErrorCode.WISHLIST_NOT_FOUND));

        wishlistRepository.delete(wishlist);

        // 상품 찜수 -1 (DB 원자적 감소, 상품이 이미 DELETED여도 카운트는 맞춰둠)
        productRepository.decrementWishlistCount(productId);
    }

    // ── 위시리스트 ───────────────────────────────────────────

    /**
     * 마이페이지(nld-904) 위시리스트 조회
     * - wishlist_id 내림차순 정렬 (WishlistRepository.findMyWishlist 의 ORDER BY 사용)
     * - DELETED 상품은 제외, SOLD 는 포함되어 '거래완료' 배지 노출
     * - ProductResponse.Summary 재사용 + 썸네일 배치 조회 (N+1 방지)
     */
    public PageResponse<ProductResponse.Summary> getMyWishlist(String memberId, Pageable pageable) {
        Page<Wishlist> page = wishlistRepository
                .findMyWishlist(memberId, ProductStatus.DELETED, pageable);

        List<Long> productIds = new ArrayList<>();
        for (Wishlist w : page.getContent()) {
            productIds.add(w.getProduct().getProductId());
        }
        Map<Long, String> thumbnailMap = productImageRepository.buildThumbnailMap(productIds);

        return PageResponse.of(page.map(w ->
                ProductResponse.Summary.from(w.getProduct(),
                        thumbnailMap.get(w.getProduct().getProductId()))));
    }

    // ── 내부 유틸 ────────────────────────────────────────────

    /** 존재하고 삭제되지 않은 상품 조회 (찜은 DELETED 상품에 불가) */
    private Product findActiveProduct(Long productId) {
        return productRepository
                .findByProductIdAndProductStatusNot(productId, ProductStatus.DELETED)
                .orElseThrow(() -> new CustomException(ErrorCode.PRODUCT_NOT_FOUND));
    }

    private Member findMember(String memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
    }

}
