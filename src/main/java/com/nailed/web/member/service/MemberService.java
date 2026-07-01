package com.nailed.web.member.service;

import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import com.nailed.common.response.PageResponse;
import com.nailed.web.member.dto.MemberRequest;
import com.nailed.web.member.dto.MemberResponse;
import com.nailed.web.member.entity.Member;
import com.nailed.web.member.repository.MemberRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private static final String DEFAULT_PROFILE_IMAGE_URL = "/images/profileImg/default-profile.png";

    private final MemberRepository memberRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public MemberResponse.Home getUserHome(String memberId) {
        MemberResponse.Profile profile = getProfile(memberId);
        long sellingProductCount = count("""
                SELECT COUNT(*) FROM products
                WHERE seller_id = :memberId AND product_status NOT IN ('DELETED', 'SOLD')
                """, memberId);
        long soldProductCount = count("""
                SELECT COUNT(*) FROM orders
                WHERE seller_id = :memberId AND order_status IN ('DELIVERED')
                """, memberId);
        long wishlistCount = count("""
                SELECT COUNT(*) FROM wishlists
                WHERE member_id = :memberId
                """, memberId);
        long buyingOrderCount = count("""
                SELECT COUNT(*) FROM orders
                WHERE buyer_id = :memberId
                """, memberId);
        long sellingOrderCount = count("""
                SELECT COUNT(*) FROM orders
                WHERE seller_id = :memberId
                """, memberId);

        return new MemberResponse.Home(
                profile, sellingProductCount, soldProductCount,
                wishlistCount, buyingOrderCount, sellingOrderCount
        );
    }

    public MemberResponse.Profile getProfile(String memberId) {
        return toProfile(findMemberProfileRow(memberId));
    }

    @Transactional
    public MemberResponse.Profile updateProfile(String memberId, MemberRequest.ProfileUpdate request) {
        ensureMemberExists(memberId);
        validateNickname(memberId, request.nickname());

        entityManager.createNativeQuery("""
                UPDATE members
                SET nickname = COALESCE(:nickname, nickname),
                    shop_info = COALESCE(:shopInfo, shop_info),
                    bank_code = COALESCE(:bankCode, bank_code),
                    account_number = COALESCE(:accountNumber, account_number),
                    depositor_name = COALESCE(:depositorName, depositor_name),
                    profile_image_url = COALESCE(:profileImageUrl, profile_image_url)
                WHERE member_id = :memberId
                """)
                .setParameter("nickname", blankToNull(request.nickname()))
                .setParameter("shopInfo", request.shopInfo())
                .setParameter("bankCode", blankToNull(request.bankCode()))
                .setParameter("accountNumber", blankToNull(request.accountNumber()))
                .setParameter("depositorName", blankToNull(request.depositorName()))
                .setParameter("profileImageUrl", blankToNull(request.profileImageUrl()))
                .setParameter("memberId", memberId)
                .executeUpdate();

        entityManager.flush();
        entityManager.clear();
        return getProfile(memberId);
    }

    public PageResponse<MemberResponse.ProductSummary> getMyProducts(String memberId, String status, Pageable pageable) {
        ensureMemberExists(memberId);

        String statusCondition = (status != null && !status.isBlank()) ? " AND p.product_status = :status" : "";

        String baseSql = """
                FROM products p
                LEFT JOIN product_groups cg ON cg.group_id = p.category_id
                LEFT JOIN product_groups bg ON bg.group_id = p.brand_id
                LEFT JOIN product_images pi ON pi.product_id = p.product_id AND pi.sort_order = 0
                WHERE p.seller_id = :memberId
                  AND p.product_status <> 'DELETED'
                """ + statusCondition;

        Query dataQuery = entityManager.createNativeQuery("""
                SELECT p.product_id, p.title, p.price, p.condition_code, p.product_status,
                       (
                           SELECT o.order_status FROM orders o
                           WHERE o.product_id = p.product_id AND o.seller_id = :memberId
                             AND o.order_status IN ('SHIPPING', 'DELIVERED')
                           ORDER BY FIELD(o.order_status, 'DELIVERED', 'SHIPPING') LIMIT 1
                       ) AS order_status,
                       EXISTS (
                           SELECT 1 FROM orders o
                           WHERE o.product_id = p.product_id AND o.seller_id = :memberId
                             AND o.order_status IN ('SHIPPING', 'DELIVERED')
                       ) AS is_sold,
                       p.view_count, p.wishlist_count, pi.image_url, p.size, cg.code, bg.name, p.created_at
                """ + baseSql + " ORDER BY p.created_at DESC");
        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(*) " + baseSql);

        setMemberAndStatus(dataQuery, memberId, status);
        setMemberAndStatus(countQuery, memberId, status);
        applyPage(dataQuery, pageable);

        List<MemberResponse.ProductSummary> content = rows(dataQuery).stream()
                .map(this::toProductSummary).toList();
        return PageResponse.of(new PageImpl<>(content, pageable, number(countQuery.getSingleResult()).longValue()));
    }

    public PageResponse<MemberResponse.OrderSummary> getMyOrders(
            String memberId, String type, String status, Pageable pageable) {
        ensureMemberExists(memberId);

        String ownerColumn = "SELL".equalsIgnoreCase(type) ? "o.seller_id" : "o.buyer_id";
        String statusCondition = (status != null && !status.isBlank()) ? " AND o.order_status = :status" : "";

        String baseSql = "FROM orders o "
                + "JOIN products p ON p.product_id = o.product_id "
                + "LEFT JOIN product_images pi ON pi.product_id = p.product_id AND pi.sort_order = 0 "
                + "WHERE " + ownerColumn + " = :memberId" + statusCondition;

        Query dataQuery = entityManager.createNativeQuery(
                "SELECT o.order_id, o.product_id, p.title, pi.image_url, o.buyer_id, o.seller_id, "
                        + "p.price, p.shipping_fee, o.final_price, o.order_status, "
                        + "o.previous_status, o.cancel_request_status, o.paid_at, o.shipped_at, "
                        + "o.delivered_at, o.cancelled_at, "
                        + "EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = o.order_id) AS has_review "
                        + baseSql + " ORDER BY o.paid_at DESC");
        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(*) " + baseSql);

        setMemberAndStatus(dataQuery, memberId, status);
        setMemberAndStatus(countQuery, memberId, status);
        applyPage(dataQuery, pageable);

        List<MemberResponse.OrderSummary> content = rows(dataQuery).stream()
                .map(this::toOrderSummary).toList();
        return PageResponse.of(new PageImpl<>(content, pageable, number(countQuery.getSingleResult()).longValue()));
    }

    public PageResponse<MemberResponse.SettlementSummary> getMySettlements(
            String memberId, String status, Pageable pageable) {
        ensureMemberExists(memberId);

        String statusCondition = (status != null && !status.isBlank()) ? " AND o.order_status = :status" : "";

        String baseSql = """
                FROM orders o
                JOIN products p ON p.product_id = o.product_id
                LEFT JOIN product_images pi ON pi.product_id = p.product_id AND pi.sort_order = 0
                LEFT JOIN members m ON m.member_id = o.seller_id
                WHERE o.seller_id = :memberId
                  AND o.order_status IN ('SHIPPING', 'DELIVERED')
                """ + statusCondition;

        Query dataQuery = entityManager.createNativeQuery("""
                SELECT o.order_id, o.product_id, p.title, pi.image_url, o.commission,
                       o.final_price, o.seller_settlement_amount, o.order_status, o.paid_at,
                       m.bank_code, m.account_number, m.depositor_name
                """ + baseSql + " ORDER BY o.paid_at DESC");
        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(*) " + baseSql);

        setMemberAndStatus(dataQuery, memberId, status);
        setMemberAndStatus(countQuery, memberId, status);
        applyPage(dataQuery, pageable);

        List<MemberResponse.SettlementSummary> content = rows(dataQuery).stream()
                .map(this::toSettlementSummary).toList();
        return PageResponse.of(new PageImpl<>(content, pageable, number(countQuery.getSingleResult()).longValue()));
    }

    @Transactional
    public void withdraw(String memberId) {
        ensureMemberExists(memberId);

        // 1) 진행중 거래(주문접수/결제완료/배송중)가 있으면 탈퇴 차단
        //    구매자·판매자 양쪽 모두 검사 — 배송/정산이 끝나지 않은 상태에서 회원이 사라지는 것을 막음
        long activeOrderCount = count("""
                SELECT COUNT(*) FROM orders
                WHERE (seller_id = :memberId OR buyer_id = :memberId)
                  AND order_status IN ('REQUESTED', 'PAID', 'SHIPPING')
                """, memberId);
        if (activeOrderCount > 0) {
            throw new CustomException(ErrorCode.WITHDRAW_HAS_ACTIVE_ORDER);
        }

        // 2) 판매중(ON_SALE) 상품 일괄 소프트 삭제
        //    판매완료(SOLD) 상품은 거래·정산 이력 보존을 위해 그대로 둠
        entityManager.createNativeQuery("""
                UPDATE products
                SET product_status = 'DELETED',
                    deleted_reason = '판매자 탈퇴',
                    deleted_at = NOW()
                WHERE seller_id = :memberId AND product_status = 'ON_SALE'
                """)
                .setParameter("memberId", memberId)
                .executeUpdate();

        // 3) 회원 상태 탈퇴 처리
        entityManager.createNativeQuery("""
                UPDATE members
                SET member_status = 'WITHDRAWN',
                    refresh_token = NULL,
                    refresh_token_expires_at = NULL
                WHERE member_id = :memberId
                """)
                .setParameter("memberId", memberId)
                .executeUpdate();
    }

    @Transactional
    public void deleteProfileImage(String memberId) {
        ensureMemberExists(memberId);

        Optional<String> currentImage = memberRepository.findProfileImageUrlByMemberId(memberId);
        if (currentImage.isPresent()
                && !currentImage.get().isBlank()
                && !currentImage.get().equals(DEFAULT_PROFILE_IMAGE_URL)) {
            String fileName = currentImage.get().replace("/images/profileImg/", "");
            Path filePath = Paths.get("src/main/resources/static/images/profileImg", fileName);
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                // 파일 삭제 실패해도 DB 업데이트는 진행
            }
        }

        entityManager.createNativeQuery("""
                UPDATE members SET profile_image_url = NULL WHERE member_id = :memberId
                """)
                .setParameter("memberId", memberId)
                .executeUpdate();
    }

    public MemberResponse.AccountInfo getAccountInfo(String memberId) {
        ensureMemberExists(memberId);
        List<?> result = entityManager.createNativeQuery("""
                SELECT bank_code, account_number, name FROM members WHERE member_id = :memberId
                """)
                .setParameter("memberId", memberId)
                .getResultList();
        if (result.isEmpty()) throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);

        Object[] row = (Object[]) result.get(0);
        return new MemberResponse.AccountInfo(string(row[0]), string(row[1]), string(row[2]));
    }

    @Transactional
    public void updateAccountInfo(String memberId, MemberRequest.UpdateAccountInfo request) {
        ensureMemberExists(memberId);

        String memberName = (String) entityManager.createNativeQuery("""
                SELECT name FROM members WHERE member_id = :memberId
                """)
                .setParameter("memberId", memberId)
                .getSingleResult();

        entityManager.createNativeQuery("""
                UPDATE members
                SET bank_code       = :bankCode,
                    account_number  = :accountNumber,
                    depositor_name  = :depositorName
                WHERE member_id = :memberId
                """)
                .setParameter("bankCode",      blankToNull(request.bankCode()))
                .setParameter("accountNumber", blankToNull(request.accountNumber()))
                .setParameter("depositorName", memberName)
                .setParameter("memberId", memberId)
                .executeUpdate();
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────

    private void ensureMemberExists(String memberId) {
        if (!memberRepository.existsById(memberId)) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
    }

    private Object[] findMemberProfileRow(String memberId) {
        List<?> result = entityManager.createNativeQuery("""
                SELECT member_id, userid, nickname, name, shop_info, member_status,
                       seller_grade, role, bank_code, account_number, depositor_name,
                       marketing_agreed, created_at, profile_image_url
                FROM members WHERE member_id = :memberId
                """)
                .setParameter("memberId", memberId)
                .getResultList();
        if (result.isEmpty()) throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        return (Object[]) result.get(0);
    }

    private void validateNickname(String memberId, String nickname) {
        String value = blankToNull(nickname);
        if (value == null) return;
        Number duplicated = number(entityManager.createNativeQuery("""
                SELECT COUNT(*) FROM members
                WHERE nickname = :nickname AND member_id <> :memberId
                """)
                .setParameter("nickname", value)
                .setParameter("memberId", memberId)
                .getSingleResult());
        if (duplicated.longValue() > 0) throw new CustomException(ErrorCode.NICKNAME_DUPLICATED);
    }

    private long count(String sql, String memberId) {
        return number(entityManager.createNativeQuery(sql)
                .setParameter("memberId", memberId)
                .getSingleResult()).longValue();
    }

    private void setMemberAndStatus(Query query, String memberId, String status) {
        query.setParameter("memberId", memberId);
        if (status != null && !status.isBlank()) query.setParameter("status", status);
    }

    private void applyPage(Query query, Pageable pageable) {
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(Query query) {
        return ((List<?>) query.getResultList()).stream()
                .map(r -> (Object[]) r)
                .toList();
    }

    private MemberResponse.Profile toProfile(Object[] row) {
        return new MemberResponse.Profile(
                string(row[0]), string(row[1]), string(row[2]), string(row[3]),
                string(row[4]), string(row[5]), string(row[6]), string(row[7]),
                string(row[8]), string(row[9]), string(row[10]),
                bool(row[11]), time(row[12]), profileImageUrl(row[13])
        );
    }

    private MemberResponse.ProductSummary toProductSummary(Object[] row) {
        return new MemberResponse.ProductSummary(
                number(row[0]).longValue(), string(row[1]), number(row[2]).intValue(),
                string(row[3]), string(row[4]), string(row[5]), bool(row[6]),
                number(row[7]).intValue(), number(row[8]).intValue(),
                string(row[9]), string(row[10]), string(row[11]), string(row[12]), time(row[13])
        );
    }

    private MemberResponse.OrderSummary toOrderSummary(Object[] row) {
        return new MemberResponse.OrderSummary(
                string(row[0]), number(row[1]).longValue(), string(row[2]), string(row[3]),
                string(row[4]), string(row[5]), number(row[6]).intValue(), number(row[7]).intValue(),
                number(row[8]).intValue(), string(row[9]), string(row[10]), string(row[11]),
                time(row[12]), time(row[13]), time(row[14]), time(row[15]), bool(row[16])
        );
    }

    private MemberResponse.SettlementSummary toSettlementSummary(Object[] row) {
        return new MemberResponse.SettlementSummary(
                string(row[0]), number(row[1]).longValue(), string(row[2]), string(row[3]),
                number(row[4]).intValue(), number(row[5]).intValue(), number(row[6]).intValue(),
                string(row[7]), time(row[8]), string(row[9]), string(row[10]), string(row[11])
        );
    }

    private String string(Object value) { return value != null ? value.toString() : null; }
    private Number number(Object value) { return (Number) value; }

    private boolean bool(Object value) {
        if (value instanceof Boolean b) return b;
        return value != null && number(value).intValue() == 1;
    }

    private LocalDateTime time(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime ldt) return ldt;
        if (value instanceof Timestamp ts) return ts.toLocalDateTime();
        return null;
    }

    private String blankToNull(String value) {
        return value != null && !value.isBlank() ? value : null;
    }

    private String profileImageUrl(Object value) {
        String url = string(value);
        return url != null && !url.isBlank() ? url : DEFAULT_PROFILE_IMAGE_URL;
    }
}
