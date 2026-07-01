package com.nailed.web.inquiry.entity;

import com.nailed.common.entity.CreatedOnlyEntity;
import com.nailed.common.enums.InquiryStatus;
import com.nailed.web.member.entity.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "inquiries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Inquiry extends CreatedOnlyEntity {

    @Id
    @Column(name = "inquiry_id", length = 20)
    private String inquiryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "category", length = 30, nullable = false)
    private String category;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "content", length = 1000, nullable = false)
    private String content;

    // @Builder.Default 필수: 이게 없으면 Inquiry.builder()로 생성 시 inquiryStatus가 null이 됨
    // (Lombok 빌더는 필드 초기값을 무시하고 명시적으로 set하지 않은 필드를 null로 둠)
    @Enumerated(EnumType.STRING)
    @Column(name = "inquiry_status", length = 20, nullable = false)
    @Builder.Default
    private InquiryStatus inquiryStatus = InquiryStatus.PENDING;

    @Column(name = "answer_content", length = 1000)
    private String answerContent;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    public void answer(String answerContent) {
        this.answerContent = answerContent;
        this.inquiryStatus = InquiryStatus.ANSWERED;
        this.answeredAt = LocalDateTime.now();
    }
}
