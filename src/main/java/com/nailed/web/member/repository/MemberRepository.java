package com.nailed.web.member.repository;

import com.nailed.web.member.entity.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, String> {

    Optional<Member> findByUserid(String userid);

    Optional<Member> findByRefreshToken(String refreshToken);

    boolean existsByUserid(String userid);

    boolean existsByNickname(String nickname);

    @Modifying
    @Query("UPDATE Member m SET m.sellerGrade = :sellerGrade WHERE m.memberId = :memberId")
    int updateSellerGrade(@Param("memberId") String memberId, @Param("sellerGrade") String sellerGrade);

    @Query("""
            SELECT m FROM Member m
            WHERE (:keyword IS NULL
                OR LOWER(m.memberId) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:role IS NULL OR m.role = :role)
              AND (:status IS NULL OR m.memberStatus = :status)
              AND (:sellerGrade IS NULL OR m.sellerGrade = :sellerGrade)
            """)
    Page<Member> searchAdminMembers(
            @Param("keyword") String keyword,
            @Param("role") String role,
            @Param("status") String status,
            @Param("sellerGrade") String sellerGrade,
            Pageable pageable);
    @Query(value = "SELECT profile_image_url FROM members WHERE member_id = :memberId", nativeQuery = true)
    Optional<String> findProfileImageUrlByMemberId(@Param("memberId") String memberId);

    @Query(value = """
            SELECT DATE_FORMAT(created_at, :dateFormat) AS label, COUNT(*) AS count
            FROM members
            WHERE role = 'USER'
              AND created_at >= :startAt
              AND created_at < :endAt
            GROUP BY DATE_FORMAT(created_at, :dateFormat)
            """, nativeQuery = true)
    List<Object[]> countUserMembersByPeriod(
            @Param("dateFormat") String dateFormat,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt);
}
