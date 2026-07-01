package com.nailed.web.member.entity;

import com.nailed.common.entity.CreatedOnlyEntity;
import com.nailed.common.enums.PenaltyType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "member_penalties")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class MemberPenalty extends CreatedOnlyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "penalty_id")
    private Long penaltyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(name = "penalty_type", length = 20, nullable = false)
    private PenaltyType penaltyType;

    @Column(name = "penalty_days")
    private Integer penaltyDays;

    @Column(name = "reason", length = 500, nullable = false)
    private String reason;

    @Column(name = "report_id", length = 20)
    private String reportId;

    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @Column(name = "ends_at")
    private LocalDateTime endsAt;
}
